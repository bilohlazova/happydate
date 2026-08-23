import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createHash } from "node:crypto";
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
import { mapKnowledgeToGifts } from "@/lib/gifts/gift.mapper";
import {
  applyGiftDiscoveryAnswersToContext,
  buildGiftDiscoveryPromptInput,
  buildGiftDiscoverySession,
  normalizeGiftDiscoveryRequest,
  type GiftDiscoveryPromptInput,
} from "@/lib/gift-discovery";
import { buildMemoryCaptureCandidates } from "@/lib/memory-capture";
import { authorizeGiftMemoryCandidates } from "@/lib/memory-capture/authorizeGiftMemoryCandidates.server";
import {
  buildGiftRecommendationContext,
  buildGiftRecommendationInstructions,
  buildGiftRepairInstructions,
  applyGiftOutcomeRecommendationPolicy,
  giftRecommendationJsonSchema,
  mapSuggestionsToLegacyIdeas,
  validateGiftRecommendations,
  type GiftRecommendationAiResponse,
  type GiftRecommendationAiPayload,
} from "@/lib/gift-intelligence";
import { DEFAULT_LOCALE, normalizeLocale } from "@/i18n/config";
import { createConfiguredAssistantRateLimiter } from "@/lib/assistant/rateLimiter";
import { classifyAssistantProviderError } from "@/lib/assistant/chatServer";
import { readBoundedJson } from "@/lib/server/readBoundedJson";
import { logAiUsageEvent, logOperationalError, logOperationalWarning } from "@/lib/observability/safeLogger";
import {
  AI_COST_POLICY,
  createConfiguredAiBudget,
  estimateInputTokens,
  estimatedUsd,
  type AiBudget,
} from "@/lib/assistant/aiBudget";

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
const GIFT_AI_TIMEOUT_MS = 30_000;
const GIFT_AI_MAX_OUTPUT_TOKENS = 2_000;

function json(body: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function boundedString(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim().length <= maxLength
    ? value.trim()
    : null;
}

function giftRateLimitKey(userId: string): string {
  return createHash("sha256").update(`gift-ai:${userId}`).digest("hex");
}

async function generateGiftRecommendations(
  payload: unknown,
  instructions: string,
  signal: AbortSignal,
  budget: AiBudget,
): Promise<GiftRecommendationAiResponse> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw Object.assign(new Error("provider unavailable"), { code: "missing_api_key" });
  const serializedPayload = JSON.stringify(payload);
  const budgetResult = await budget.reserve(
    estimateInputTokens([{ content: instructions }, { content: serializedPayload }]),
    GIFT_AI_MAX_OUTPUT_TOKENS,
  );
  if (!budgetResult.allowed) {
    throw Object.assign(new Error("daily AI budget exceeded"), {
      code: "daily_ai_budget_exceeded",
      retryAfter: budgetResult.retryAfterSeconds,
    });
  }
  const openai = new OpenAI({ apiKey });
  const ai = await openai.responses.create({
    model: "gpt-4.1-mini",
    temperature: 0.8,
    max_output_tokens: GIFT_AI_MAX_OUTPUT_TOKENS,
    instructions,
    input: serializedPayload,
    text: {
      format: {
        type: "json_schema",
        name: "gift_recommendations",
        strict: true,
        schema: giftRecommendationJsonSchema,
      },
    },
  }, { signal });

  if (ai.usage) {
    const usage = { inputTokens: ai.usage.input_tokens, outputTokens: ai.usage.output_tokens };
    await budgetResult.reservation.settle(usage).catch(() => {
      logOperationalWarning("ai-budget", "settlement-skipped", { category: "upstash_unavailable" });
    });
    logAiUsageEvent({
      feature: "gift-recommendations",
      ...usage,
      estimatedUsd: estimatedUsd(usage),
      pricingVersion: AI_COST_POLICY.version,
    });
  }

  const output = ai.output_text;

  if (!output) {
    throw new Error("Empty AI output");
  }

  try {
    return JSON.parse(output) as GiftRecommendationAiResponse;
  } catch {
    throw new Error("Invalid JSON from AI");
  }
}

/* ================= ROUTE ================= */

export async function POST(req: Request) {
  let release: (() => Promise<void>) | undefined;
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

    const limiter = createConfiguredAssistantRateLimiter();
    if (!limiter) return json({ ideas: [], error: "service_unavailable" }, 503);
    const rateKey = giftRateLimitKey(ownedPerson.userId);
    let limit;
    try {
      limit = await limiter.check(rateKey, "authenticated");
    } catch {
      return json({ ideas: [], error: "service_unavailable" }, 503);
    }
    if (!limit.allowed) {
      const retryAfter = Math.max(1, Math.min(600, Math.ceil((limit.resetAt - Date.now()) / 1_000)));
      return json({ ideas: [], error: "rate_limited", retryAfter }, 429, { "Retry-After": String(retryAfter) });
    }
    if (limiter.acquire) {
      release = await limiter.acquire(rateKey) ?? undefined;
      if (!release) return json({ ideas: [], error: "too_many_concurrent_requests" }, 429, { "Retry-After": "5" });
    }
    const aiBudget = createConfiguredAiBudget();
    if (!aiBudget) return json({ ideas: [], error: "service_unavailable" }, 503);

    /* ================= LOAD PERSON ================= */

    const baseGiftRecommendationContext = buildGiftRecommendationContext({
      person: {
        id: person.id,
        name: person.name,
        relationKey: person.relationKey,
        relationship: person.relation,
        gender: person.gender,
        birthday: person.birthday,
      },
      event: {
        id: boundedString(body.event?.id, 128),
        category: boundedString(body.event?.category, 80) ?? occasion,
        date: boundedString(body.event?.date, 40),
        personId: boundedString(body.event?.personId, 128) ?? person.id,
      },
      knowledge,
      gifts: mapKnowledgeToGifts(knowledge),
      outcomeLearningEnabled,
      confirmedGiftOutcomes,
      budget: body.budget ? {
        amount: typeof body.budget.amount === "number" && Number.isFinite(body.budget.amount)
          && body.budget.amount >= 0 && body.budget.amount <= 1_000_000_000
            ? body.budget.amount
            : null,
        currency: boundedString(body.budget.currency, 12),
      } : null,
      locale,
    });
    const giftRecommendationContext = applyGiftDiscoveryAnswersToContext(
      baseGiftRecommendationContext,
      discoveryRequest.answers,
    );

    /* ================= PROMPT ================= */
    const giftDiscoverySession = buildGiftDiscoverySession({
      context: giftRecommendationContext,
      answeredQuestions: discoveryRequest.answeredQuestions,
      skippedQuestions: discoveryRequest.skippedQuestionIds,
    });
    const giftDiscoveryPromptInput = buildGiftDiscoveryPromptInput(giftDiscoverySession);
    const giftRecommendationPayload = {
      context: giftRecommendationContext,
      discovery: giftDiscoveryPromptInput,
    } satisfies GiftRecommendationAiPayload<GiftDiscoveryPromptInput>;

    /* ================= OPENAI ================= */

    const providerSignal = AbortSignal.timeout(GIFT_AI_TIMEOUT_MS);
    const parsed = await generateGiftRecommendations(
      giftRecommendationPayload,
      buildGiftRecommendationInstructions(giftRecommendationContext, giftDiscoveryPromptInput),
      providerSignal,
      aiBudget,
    );
    let validated = validateGiftRecommendations(parsed, giftRecommendationContext, {
      discoverySession: giftDiscoverySession,
    });

    if (validated.suggestions.length < 5 && validated.validationErrors.length > 0) {
      const repairInput = {
        ...giftRecommendationPayload,
        validationErrors: validated.validationErrors,
        validSuggestions: validated.suggestions,
      };
      const repaired = await generateGiftRecommendations(
        repairInput,
        buildGiftRepairInstructions(giftRecommendationContext),
        providerSignal,
        aiBudget,
      );
      const repairedValidated = validateGiftRecommendations(
        {
          suggestions: [...validated.suggestions, ...repaired.suggestions],
          followUpQuestions: validated.followUpQuestions.length
            ? validated.followUpQuestions
            : repaired.followUpQuestions,
        },
        giftRecommendationContext,
        {
          repairAttempted: true,
          discoverySession: giftDiscoverySession,
        },
      );
      validated = repairedValidated;
    }
    validated = {
      ...validated,
      suggestions: applyGiftOutcomeRecommendationPolicy(
        validated.suggestions,
        giftRecommendationContext.outcomeLearning.evidence,
        giftRecommendationContext.outcomeLearning.enabled,
      ),
    };
    const legacyIdeas = mapSuggestionsToLegacyIdeas(validated.suggestions);
    const legacyMemoryCandidates = buildMemoryCaptureCandidates({
      context: giftRecommendationContext,
      discoveryAnswers: discoveryRequest.answers,
      aiResponse: parsed,
    });
    const memoryCandidates = authorizeGiftMemoryCandidates({
      userId: ownedPerson.userId,
      person: { id: person.id, name: person.name?.trim() || "Contact" },
      knowledge,
      candidates: legacyMemoryCandidates,
      tokenSecret: process.env.HAPPY_LEARNING_TOKEN_SECRET?.trim() ?? "",
    });

    /* ================= SAVE CACHE ================= */

    if (!hasDiscoverySessionInput) {
      await saveGiftIdeas(ownedPerson, occasion, locale, legacyIdeas);
    }

    /* ================= RETURN ================= */

    return json({
      ideas: legacyIdeas,
      suggestions: validated.suggestions,
      followUpQuestions: validated.followUpQuestions,
      discovery: giftDiscoveryPromptInput,
      memoryCandidates,
      diagnostics: validated.diagnostics,
      cached: false,
    });
  } catch (error) {
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
  } finally {
    await release?.();
  }
}
