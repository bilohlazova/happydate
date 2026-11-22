import { NextResponse } from "next/server";
import {
  getCachedGiftIdeas,
  findOwnedGiftPerson,
  loadGiftIntelligenceSource,
  saveGiftIdeas,
} from "@/lib/repositories/giftIntelligenceRepository.server";
import {
  authenticateGiftRequest,
  resolveGiftAccess,
} from "@/lib/gifts/giftApiSecurity";
import { normalizeGiftDiscoveryRequest } from "@/lib/gift-discovery";
import {
  boundedString,
  GIFT_AI_TIMEOUT_MS,
  runGiftRecommendationPipeline,
} from "@/lib/gift-intelligence/giftRecommendationService.server";
import { DEFAULT_LOCALE, normalizeLocale } from "@/i18n/config";
import { classifyAssistantProviderError } from "@/lib/assistant/chatServer";
import { readBoundedJson } from "@/lib/server/readBoundedJson";
import { logOperationalError } from "@/lib/observability/safeLogger";
import { aiExecutionFailureResponse } from "@/lib/assistant/aiExecutionError";

/* ================= TYPES ================= */

type GiftRequestBody = {
  personId?: unknown;
  occasion?: unknown;
  locale?: unknown;
  budget?: {
    amount?: unknown;
    currency?: unknown;
  } | null;
  event?: {
    id?: unknown;
    category?: unknown;
    date?: unknown;
    personId?: unknown;
  } | null;
  discoveryAnswers?: unknown;
  skippedDiscoveryQuestions?: unknown;
};

/* ================= ENV ================= */

const MAX_GIFT_REQUEST_BYTES = 32 * 1024;

function json(body: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}



/* ================= ROUTE ================= */

export async function POST(req: Request) {
  try {
    const parsedBody = await readBoundedJson(req, MAX_GIFT_REQUEST_BYTES);
    if (!parsedBody.ok) return json({ ideas: [], error: parsedBody.error }, parsedBody.status);
    if (!parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) {
      return json({ ideas: [], error: "invalid_request" }, 400);
    }
    const body = parsedBody.value as GiftRequestBody;

    const personId = boundedString(body.personId, 128) ?? undefined;
    const occasionValue = boundedString(body.occasion, 80);
    const occasion = occasionValue
      ? occasionValue
      : "general";
    const locale = normalizeLocale(body.locale) ?? DEFAULT_LOCALE;
    const discoveryRequest = normalizeGiftDiscoveryRequest({
      discoveryAnswers: body.discoveryAnswers,
      skippedDiscoveryQuestions: body.skippedDiscoveryQuestions,
    });
    const hasDiscoverySessionInput =
      Object.keys(discoveryRequest.answers).length > 0 ||
      discoveryRequest.skippedQuestionIds.length > 0;

    if (!personId) {
      return json({ ideas: [], error: "invalid_request" }, 400);
    }

    /* ================= CACHE CHECK ================= */

    const access = await resolveGiftAccess(req, personId, {
      authenticate: authenticateGiftRequest,
      findOwnedPerson: findOwnedGiftPerson,
    });
    if (!access.ok) {
      return json(
        { ideas: [], error: access.error },
        access.status,
      );
    }
    const ownedPerson = access.person;

    const { person, knowledge, outcomeLearningEnabled, confirmedGiftOutcomes } =
      await loadGiftIntelligenceSource(ownedPerson);
    const usesOutcomeLearning = outcomeLearningEnabled && confirmedGiftOutcomes.length > 0;
    const cached = hasDiscoverySessionInput || usesOutcomeLearning
      ? null
      : await getCachedGiftIdeas(ownedPerson, occasion, locale);

    if (cached) {
      return json({
        ideas: cached,
        cached: true,
      });
    }

    /* ================= SHARED PIPELINE ================= */

    const result = await runGiftRecommendationPipeline({
      ownedPerson,
      source: { person, knowledge, outcomeLearningEnabled, confirmedGiftOutcomes },
      locale,
      occasion,
      event: body.event,
      budget: body.budget,
      discoveryRequest,
      surface: "page",
      signal: AbortSignal.timeout(GIFT_AI_TIMEOUT_MS),
    });
    const legacyIdeas = result.ideas;

    /* ================= SAVE CACHE ================= */

    if (!hasDiscoverySessionInput) {
      await saveGiftIdeas(ownedPerson, occasion, locale, legacyIdeas);
    }

    /* ================= RETURN ================= */

    return json({
      ideas: legacyIdeas,
      suggestions: result.suggestions,
      followUpQuestions: result.followUpQuestions,
      discovery: result.discovery,
      memoryCandidates: result.memoryCandidates,
      diagnostics: result.diagnostics,
      cached: false,
    });
  } catch (error) {
    // Rate limit, concurrency, daily budget and hosted-session denials all come
    // from the shared SEC-01 provider boundary.
    const guarded = aiExecutionFailureResponse(error);
    if (guarded) return guarded;
    if (error && typeof error === "object" && "code" in error && error.code === "daily_ai_budget_exceeded") {
      const retryAfter = "retryAfter" in error && typeof error.retryAfter === "number" ? error.retryAfter : 3600;
      return json(
        { ideas: [], error: "daily_ai_budget_exceeded", retryAfter },
        429,
        { "Retry-After": String(retryAfter) },
      );
    }
    const diagnostic = classifyAssistantProviderError(error);
    logOperationalError("gift-ai", "request-failed", diagnostic);
    const providerFailure = diagnostic.errorType !== "unknown";
    return json(
      { ideas: [], error: providerFailure ? "provider_unavailable" : "request_failed" },
      providerFailure ? 503 : 500,
    );
  }
}
