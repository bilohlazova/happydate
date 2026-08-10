import type {
  GiftOutcomeCategorySignal,
  GiftOutcomeLearningEvidence,
  GiftOutcomeLearningSignal,
  GiftRecommendationCategory,
} from "./giftIntelligence.types.ts";
import { classifyGiftFeedbackCategory } from "./giftFeedbackCategory.ts";

export const STABLE_GIFT_OUTCOME_MIN_CONFIRMATIONS = 2;

type CategoryCounts = { liked: number; not_liked: number };

function signalFor(counts: CategoryCounts): GiftOutcomeCategorySignal {
  if (counts.liked > 0 && counts.not_liked > 0) return "conflicted";
  if (counts.liked >= STABLE_GIFT_OUTCOME_MIN_CONFIRMATIONS) return "stable_like";
  if (counts.not_liked >= STABLE_GIFT_OUTCOME_MIN_CONFIRMATIONS) return "stable_avoid";
  return "insufficient";
}

/**
 * A single outcome remains exact-gift evidence. Category generalization needs
 * repeated, conflict-free confirmation; unsure never becomes a preference.
 */
export function buildGiftOutcomeLearningSignals(
  evidence: readonly GiftOutcomeLearningEvidence[],
): GiftOutcomeLearningSignal[] {
  const categorized = evidence.map((item) => ({
    ...item,
    category: item.category
      ?? classifyGiftFeedbackCategory(`${item.giftTitle} ${item.note ?? ""}`),
  }));
  const counts = new Map<GiftRecommendationCategory, CategoryCounts>();

  for (const item of categorized) {
    if (item.category === "other" || item.outcome === "unsure") continue;
    const current = counts.get(item.category) ?? { liked: 0, not_liked: 0 };
    current[item.outcome] += 1;
    counts.set(item.category, current);
  }

  return categorized.map((item) => ({
    ...item,
    categorySignal: item.category === "other"
      ? "insufficient"
      : signalFor(counts.get(item.category) ?? { liked: 0, not_liked: 0 }),
  }));
}
