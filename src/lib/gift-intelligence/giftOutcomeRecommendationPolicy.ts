import type {
  GiftOutcomeLearningEvidence,
  GiftOutcomeLearningSignal,
  GiftRecommendationLearningEvidence,
  GiftRecommendationSuggestion,
} from "./giftIntelligence.types.ts";
import { normalizeGiftTitle } from "./giftRecommendationValidation.ts";
import { classifyGiftFeedbackCategory } from "./giftFeedbackCategory.ts";
import { buildGiftOutcomeLearningSignals } from "./giftOutcomeLearningSignals.ts";

const STOP_WORDS = new Set([
  "gift", "present", "idea", "for", "the", "and", "для", "подарунок", "подарок",
  "prezent", "dla", "und", "geschenk", "fur", "für",
]);

function tokens(value: string): Set<string> {
  return new Set(normalizeGiftTitle(value).split(" ").filter((token) => token.length > 2 && !STOP_WORDS.has(token)));
}

function matchEvidence(
  suggestion: GiftRecommendationSuggestion,
  evidence: GiftOutcomeLearningSignal,
): GiftRecommendationLearningEvidence | null {
  const suggestionTokens = tokens(`${suggestion.title} ${suggestion.category.replace("_", " ")}`);
  const evidenceTokens = tokens(`${evidence.giftTitle} ${evidence.note ?? ""}`);
  const category = evidence.category
    ?? classifyGiftFeedbackCategory(`${evidence.giftTitle} ${evidence.note ?? ""}`);
  if ([...suggestionTokens].some((token) => evidenceTokens.has(token))) {
    return { ...evidence, category, matchedBy: "text" };
  }
  const stableOutcomeMatches =
    (evidence.categorySignal === "stable_like" && evidence.outcome === "liked")
    || (evidence.categorySignal === "stable_avoid" && evidence.outcome === "not_liked");
  if (category !== "other" && category === suggestion.category && stableOutcomeMatches) {
    return { ...evidence, category, matchedBy: "category" };
  }
  return null;
}

function evidenceWeight(evidence: GiftRecommendationLearningEvidence): number {
  const strength = evidence.matchedBy === "text" ? 2 : 1;
  if (evidence.outcome === "liked") return strength;
  if (evidence.outcome === "not_liked") return -strength;
  return 0;
}

/**
 * Stable, auditable ranking. AI cannot invent or select evidence: only exact
 * user-confirmed outcomes with deterministic token overlap affect ordering.
 */
export function applyGiftOutcomeRecommendationPolicy(
  suggestions: readonly GiftRecommendationSuggestion[],
  evidence: readonly GiftOutcomeLearningEvidence[],
  enabled: boolean,
): GiftRecommendationSuggestion[] {
  if (!enabled || evidence.length === 0) return suggestions.map((item) => ({ ...item }));
  const learningSignals = buildGiftOutcomeLearningSignals(evidence);
  return suggestions
    .map((suggestion, originalIndex) => {
      const learningEvidence = learningSignals
        .map((item) => matchEvidence(suggestion, item))
        .filter((item): item is GiftRecommendationLearningEvidence => item !== null);
      return {
        suggestion: learningEvidence.length ? { ...suggestion, learningEvidence } : { ...suggestion },
        originalIndex,
        score: learningEvidence.reduce((sum, item) => sum + evidenceWeight(item), 0),
      };
    })
    .sort((first, second) => second.score - first.score || first.originalIndex - second.originalIndex)
    .map(({ suggestion }) => suggestion);
}
