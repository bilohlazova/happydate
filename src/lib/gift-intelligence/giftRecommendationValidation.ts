import {
  buildGiftDiscoveryFollowUpQuestions,
  type GiftDiscoverySession,
} from "../gift-discovery/index.ts";
import type {
  GiftLegacyIdea,
  GiftPersonalizationSignal,
  GiftRecommendationAiResponse,
  GiftRecommendationCaution,
  GiftRecommendationCategory,
  GiftRecommendationConfidence,
  GiftRecommendationContext,
  GiftRecommendationSuggestion,
  GiftRecommendationValidationResult,
} from "./giftIntelligence.types.ts";

const CATEGORY_SET = new Set<GiftRecommendationCategory>([
  "experience",
  "book",
  "food_drink",
  "flowers",
  "electronics",
  "beauty",
  "home",
  "fashion",
  "subscription",
  "travel",
  "hobby",
  "other",
]);
const CONFIDENCE_SET = new Set<GiftRecommendationConfidence>(["low", "medium", "high"]);
const SIGNAL_SET = new Set<GiftPersonalizationSignal>([
  "relation",
  "event",
  "interest",
  "preference",
  "memory",
  "previous_gift_avoidance",
  "budget",
  "season",
  "age",
  "gender",
]);
const CAUTION_SET = new Set<GiftRecommendationCaution>([
  "price_uncertain",
  "limited_context",
  "legacy_fallback",
  "verify_availability",
]);

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || null;
}

export function normalizeGiftTitle(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function price(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

function canonicalCategory(value: unknown): GiftRecommendationCategory {
  return typeof value === "string" && CATEGORY_SET.has(value as GiftRecommendationCategory)
    ? value as GiftRecommendationCategory
    : "other";
}

function canonicalConfidence(value: unknown): GiftRecommendationConfidence {
  return typeof value === "string" && CONFIDENCE_SET.has(value as GiftRecommendationConfidence)
    ? value as GiftRecommendationConfidence
    : "low";
}

function uniqueCanonical<T extends string>(values: unknown, allowed: Set<T>): T[] {
  if (!Array.isArray(values)) return [];
  const result: T[] = [];
  const seen = new Set<T>();
  for (const value of values) {
    if (typeof value !== "string" || !allowed.has(value as T)) continue;
    const canonical = value as T;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    result.push(canonical);
  }
  return result;
}

function confidenceCeiling(context: GiftRecommendationContext): GiftRecommendationConfidence {
  const missing = new Set(context.missingSignals);
  const weakSignals = [
    "missing_preferences",
    "missing_memories",
    "missing_relationship",
    "missing_age",
    "missing_budget",
  ].filter((signal) => missing.has(signal as never)).length;
  if (weakSignals >= 3) return "low";
  if (weakSignals >= 1) return "medium";
  return "high";
}

function applyConfidenceCeiling(
  confidence: GiftRecommendationConfidence,
  ceiling: GiftRecommendationConfidence,
): GiftRecommendationConfidence {
  const rank = { low: 0, medium: 1, high: 2 } as const;
  return rank[confidence] <= rank[ceiling] ? confidence : ceiling;
}

function normalizeSuggestion(
  value: unknown,
  context: GiftRecommendationContext,
): GiftRecommendationSuggestion | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const title = text(input.title);
  const why = text(input.why);
  if (!title || !why) return null;

  const cautions = uniqueCanonical(input.cautions, CAUTION_SET);
  const estimatedPrice = price(input.estimatedPrice);
  if (estimatedPrice === null && !cautions.includes("price_uncertain")) {
    cautions.push("price_uncertain");
  }
  if (context.missingSignals.length && !cautions.includes("limited_context")) {
    cautions.push("limited_context");
  }

  return {
    title,
    category: canonicalCategory(input.category),
    why,
    confidence: applyConfidenceCeiling(
      canonicalConfidence(input.confidence),
      confidenceCeiling(context),
    ),
    estimatedPrice,
    currency: text(input.currency)?.toLocaleUpperCase() ?? context.budget.currency,
    personalizationSignals: uniqueCanonical(input.personalizationSignals, SIGNAL_SET),
    cautions,
  };
}

function blockedGiftValues(context: GiftRecommendationContext): Set<string> {
  return new Set([
    ...context.duplicateAvoidance.previousGiftValues,
    ...context.gifts.active.map((gift) => gift.value),
  ].map(normalizeGiftTitle));
}

function followUpQuestionsFromMissingSignals(
  context: GiftRecommendationContext,
  _modelQuestions: unknown,
): string[] {
  if (!context.missingSignals.length) return [];
  return context.missingSignals.slice(0, 3).map((signal) => `question:${signal}`);
}

function followUpQuestions(
  context: GiftRecommendationContext,
  modelQuestions: unknown,
  discoverySession?: GiftDiscoverySession,
): string[] {
  if (discoverySession) {
    return buildGiftDiscoveryFollowUpQuestions(discoverySession, modelQuestions, 3);
  }
  return followUpQuestionsFromMissingSignals(context, modelQuestions);
}

export function validateGiftRecommendations(
  response: GiftRecommendationAiResponse | unknown,
  context: GiftRecommendationContext,
  options: {
    repairAttempted?: boolean;
    discoverySession?: GiftDiscoverySession;
  } = {},
): GiftRecommendationValidationResult {
  const input = response && typeof response === "object"
    ? response as Record<string, unknown>
    : {};
  const rawSuggestions = Array.isArray(input.suggestions) ? input.suggestions : [];
  const blocked = blockedGiftValues(context);
  const seen = new Set<string>();
  const suggestions: GiftRecommendationSuggestion[] = [];
  const validationErrors: string[] = [];
  let duplicateRejectedCount = 0;
  let budgetRejectedCount = 0;

  for (const raw of rawSuggestions) {
    const suggestion = normalizeSuggestion(raw, context);
    if (!suggestion) {
      validationErrors.push("invalid_schema");
      continue;
    }

    const key = normalizeGiftTitle(suggestion.title);
    if (blocked.has(key)) {
      duplicateRejectedCount += 1;
      validationErrors.push(`duplicate_blocked:${key}`);
      continue;
    }
    if (seen.has(key)) {
      duplicateRejectedCount += 1;
      validationErrors.push(`duplicate_response:${key}`);
      continue;
    }
    if (
      context.budget.amount !== null &&
      suggestion.estimatedPrice !== null &&
      suggestion.estimatedPrice > context.budget.amount * 1.15
    ) {
      budgetRejectedCount += 1;
      validationErrors.push(`over_budget:${key}`);
      continue;
    }

    seen.add(key);
    suggestions.push(suggestion);
  }

  const validatedFollowUpQuestions = followUpQuestions(
    context,
    input.followUpQuestions,
    options.discoverySession,
  );
  return {
    suggestions,
    followUpQuestions: validatedFollowUpQuestions,
    diagnostics: {
      generatedCount: rawSuggestions.length,
      duplicateRejectedCount,
      budgetRejectedCount,
      missingSignalsCount: context.missingSignals.length,
      completionScore: options.discoverySession?.completionScore,
      remainingQuestionCount: options.discoverySession?.remainingQuestions.length,
      answeredQuestionCount: options.discoverySession?.answeredQuestions.length,
      followUpQuestionCount: validatedFollowUpQuestions.length,
      locale: context.locale,
      repairAttempted: options.repairAttempted === true,
    },
    validationErrors,
  };
}

function priceRange(suggestion: GiftRecommendationSuggestion): string {
  if (suggestion.estimatedPrice === null) return "price_uncertain";
  const currency = suggestion.currency ?? "";
  return `${suggestion.estimatedPrice} ${currency}`.trim();
}

export function mapSuggestionToLegacyIdea(
  suggestion: GiftRecommendationSuggestion,
): GiftLegacyIdea {
  return {
    title: suggestion.title,
    explanation: suggestion.why,
    why: suggestion.why,
    price_range: priceRange(suggestion),
  };
}

export function mapSuggestionsToLegacyIdeas(
  suggestions: readonly GiftRecommendationSuggestion[],
): GiftLegacyIdea[] {
  return suggestions.map(mapSuggestionToLegacyIdea);
}
