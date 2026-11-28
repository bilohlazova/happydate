import OpenAI from "openai";
import type { GiftIntelligenceSource, OwnedGiftPerson } from "@/lib/repositories/giftIntelligenceRepository.server";
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
import { buildUnifiedPersonContext, type PersonProfileForStructuredAi } from "@/lib/person-context";
import { loadAssistantPetContext } from "@/lib/assistant/petContext.server";
import { loadAssistantPersonSymbol } from "@/lib/assistant/personSymbolContext.server";
import { loadPersonHappyConversationHistory } from "@/lib/assistant/happyConversationHistory.server";
import { loadMergedPersonHistory } from "@/lib/assistant/conversationMemory.server";
import { attachProductOffers } from "./giftProductSearch.server";
import { listShownGiftIdeas, recordShownGiftIdeas } from "./shownGiftIdeas.server";
import { ASSISTANT_CHAT_CONFIG } from "@/lib/assistant/chatConfig";
import type { AppLocale } from "@/i18n/config";
import { logAiUsageEvent, logOperationalWarning } from "@/lib/observability/safeLogger";
import { AI_COST_POLICY, estimatedUsd } from "@/lib/assistant/aiBudget";
import { withAiExecutionScope, runMeteredAiCall, parseOpenAiUsage } from "@/lib/assistant/aiExecution.server";

/**
 * The single Gift Intelligence pipeline. Both the /gift/start API route and the
 * Happy Chat `suggest_gifts` tool call this function, so every surface builds
 * the same context, uses the same prompt, validation and outcome learning.
 * Authentication, ownership, rate limiting and caching stay with the caller.
 */

export const GIFT_AI_TIMEOUT_MS = 30_000;
const GIFT_AI_MAX_OUTPUT_TOKENS = 2_500;

export function boundedString(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim().length <= maxLength
    ? value.trim()
    : null;
}

async function generateGiftRecommendations(
  payload: unknown,
  instructions: string,
  signal: AbortSignal,
): Promise<GiftRecommendationAiResponse> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw Object.assign(new Error("provider unavailable"), { code: "missing_api_key" });
  const serializedPayload = JSON.stringify(payload);
  const params = {
    model: ASSISTANT_CHAT_CONFIG.giftModel,
    temperature: 0.9,
    max_output_tokens: GIFT_AI_MAX_OUTPUT_TOKENS,
    instructions,
    input: serializedPayload,
    text: {
      format: {
        type: "json_schema" as const,
        name: "gift_recommendations",
        strict: true,
        schema: giftRecommendationJsonSchema,
      },
    },
  };
  // Every provider call goes through the SEC-01 boundary: rate limit,
  // concurrency lease, daily budget and hosted-session accounting.
  const ai = await runMeteredAiCall({ feature: "gifts", model: params.model, payload: params, maxOutputTokens: params.max_output_tokens,
    call: () => new OpenAI({ apiKey, maxRetries: 0 }).responses.create(params, { signal }),
    usage: value => parseOpenAiUsage(value.usage, "responses"),
  });

  const usage = parseOpenAiUsage(ai.usage, "responses");
  if (usage) {
    logAiUsageEvent({
      feature: "gift-recommendations",
      ...usage,
      estimatedUsd: estimatedUsd(usage),
      pricingVersion: AI_COST_POLICY.version,
    });
  }

  const output = ai.output_text;
  if (!output) throw new Error("Empty AI output");
  try {
    return JSON.parse(output) as GiftRecommendationAiResponse;
  } catch {
    throw new Error("Invalid JSON from AI");
  }
}


export type GiftPipelineInput = {
  ownedPerson: OwnedGiftPerson;
  source: GiftIntelligenceSource;
  locale: AppLocale;
  occasion: string;
  event?: { id?: unknown; category?: unknown; date?: unknown; personId?: unknown } | null;
  budget?: { amount?: unknown; currency?: unknown } | null;
  discoveryRequest: ReturnType<typeof normalizeGiftDiscoveryRequest>;
  /** Which surface asked, recorded with every shown idea. */
  surface: "page" | "chat";
  signal?: AbortSignal;
};

/**
 * Identity comes from the server-verified owner of the person, never from the
 * browser or the model, so the budget and limits always apply to the real user.
 */
export function runGiftRecommendationPipeline(input: GiftPipelineInput) {
  return withAiExecutionScope({ kind: "authenticated", key: input.ownedPerson.userId }, () => runPipeline(input));
}

async function runPipeline(input: GiftPipelineInput) {
  const { ownedPerson, locale, occasion, discoveryRequest } = input;
  const { person, knowledge, outcomeLearningEnabled, confirmedGiftOutcomes } = input.source;

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
      id: boundedString(input.event?.id, 128),
      category: boundedString(input.event?.category, 80) ?? occasion,
      date: boundedString(input.event?.date, 40),
      personId: boundedString(input.event?.personId, 128) ?? person.id,
    },
    knowledge,
    gifts: mapKnowledgeToGifts(knowledge),
    outcomeLearningEnabled,
    confirmedGiftOutcomes,
    budget: input.budget ? {
      amount: typeof input.budget.amount === "number" && Number.isFinite(input.budget.amount)
        && input.budget.amount >= 0 && input.budget.amount <= 1_000_000_000
          ? input.budget.amount
          : null,
      currency: boundedString(input.budget.currency, 12),
    } : null,
    locale,
  });
  // Ideas already shown to this user for this person (page or chat) are never
  // proposed again by accident; they join the duplicate-avoidance list.
  const alreadyShown = await listShownGiftIdeas({ userId: ownedPerson.userId, personId: person.id, limit: 40 });
  const withDiscovery = applyGiftDiscoveryAnswersToContext(
    baseGiftRecommendationContext,
    discoveryRequest.answers,
  );
  const giftRecommendationContext = alreadyShown.length
    ? {
        ...withDiscovery,
        duplicateAvoidance: {
          previousGiftValues: [
            ...withDiscovery.duplicateAvoidance.previousGiftValues,
            ...alreadyShown.map((idea) => idea.title),
          ],
        },
      }
    : withDiscovery;

  /* ================= PROMPT ================= */
  const giftDiscoverySession = buildGiftDiscoverySession({
    context: giftRecommendationContext,
    answeredQuestions: discoveryRequest.answeredQuestions,
    skippedQuestions: discoveryRequest.skippedQuestionIds,
  });
  const giftDiscoveryPromptInput = buildGiftDiscoveryPromptInput(giftDiscoverySession);
  // The same canonical person profile Happy Chat uses. A failure to load any
  // optional layer must never block recommendations.
  let personProfile: PersonProfileForStructuredAi | null = null;
  try {
    const [pets, symbol, legacyConversations] = await Promise.all([
      loadAssistantPetContext({ userId: ownedPerson.userId, personId: person.id }),
      loadAssistantPersonSymbol({ userId: ownedPerson.userId, personId: person.id }),
      loadPersonHappyConversationHistory({ userId: ownedPerson.userId, personId: person.id }),
    ]);
    const happyConversations = await loadMergedPersonHistory({ userId: ownedPerson.userId, personId: person.id, legacy: legacyConversations });
    personProfile = buildUnifiedPersonContext({
      personId: person.id,
      personName: person.name?.trim() || "Contact",
      relationLabel: person.relation,
      birthday: person.birthday,
      knowledge,
      symbol,
      pets,
      happyConversations,
      locale: locale === "uk" ? "uk" : "en",
    }).forStructuredAi;
  } catch {
    logOperationalWarning("gift-ai", "person-profile-skipped");
  }
  const giftRecommendationPayload = {
    context: giftRecommendationContext,
    discovery: giftDiscoveryPromptInput,
    profile: personProfile,
  } satisfies GiftRecommendationAiPayload<GiftDiscoveryPromptInput, PersonProfileForStructuredAi>;

  /* ================= OPENAI ================= */

  const providerSignal = input.signal ?? AbortSignal.timeout(GIFT_AI_TIMEOUT_MS);
  const parsed = await generateGiftRecommendations(
    giftRecommendationPayload,
    buildGiftRecommendationInstructions(giftRecommendationContext, giftDiscoveryPromptInput),
    providerSignal,
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
  // Real products and prices from live web search, best effort. Ideas are never
  // dropped when search is unavailable; they just carry no offer.
  const withOffers = await attachProductOffers({
    suggestions: validated.suggestions,
    budget: giftRecommendationContext.budget,
    locale,
  });
  validated = { ...validated, suggestions: withOffers.suggestions };
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

  await recordShownGiftIdeas({
    userId: ownedPerson.userId,
    personId: person.id,
    source: input.surface,
    occasion,
    ideas: validated.suggestions.map((idea) => ({
      title: idea.title,
      why: idea.why,
      estimatedPrice: idea.offer?.price ?? idea.estimatedPrice,
      currency: idea.offer?.currency ?? idea.currency,
      offerUrl: idea.offer?.url ?? null,
    })),
  });
  return {
    ideas: legacyIdeas,
    suggestions: validated.suggestions,
    followUpQuestions: validated.followUpQuestions,
    discovery: giftDiscoveryPromptInput,
    memoryCandidates,
    diagnostics: validated.diagnostics,
  };
}
