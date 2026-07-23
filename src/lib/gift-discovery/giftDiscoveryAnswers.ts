import type { GiftRecommendationContext } from "../gift-intelligence";
import {
  GIFT_DISCOVERY_QUESTION_TYPES,
  type GiftDiscoveryAnsweredQuestion,
  type GiftDiscoveryAnswers,
  type GiftDiscoveryPreferredStyle,
  type GiftDiscoveryQuestionType,
  type GiftDiscoveryRelationshipStrength,
  type GiftDiscoveryUrgency,
} from "./giftDiscovery.types.ts";

const QUESTION_TYPES = new Set<GiftDiscoveryQuestionType>(GIFT_DISCOVERY_QUESTION_TYPES);
const RELATIONSHIP_STRENGTH = new Set<GiftDiscoveryRelationshipStrength>([
  "close",
  "medium",
  "distant",
]);
const PREFERRED_STYLE = new Set<GiftDiscoveryPreferredStyle>([
  "practical",
  "emotional",
  "elegant",
]);
const URGENCY = new Set<GiftDiscoveryUrgency>(["today", "thisWeek", "flexible"]);
const MAX_BUDGET = 100_000;
const MAX_TEXT_LENGTH = 180;
const MAX_DISLIKED_TEXT_LENGTH = 300;

export interface NormalizedGiftDiscoveryRequest {
  answers: GiftDiscoveryAnswers;
  skippedQuestionIds: string[];
  answeredQuestions: GiftDiscoveryAnsweredQuestion[];
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function text(value: unknown, maxLength = MAX_TEXT_LENGTH): string | null {
  if (typeof value !== "string") return null;
  const normalized = compact(value);
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

export function giftDiscoveryQuestionTypeFromId(
  questionId: string,
): GiftDiscoveryQuestionType | null {
  const normalized = compact(questionId);
  if (QUESTION_TYPES.has(normalized as GiftDiscoveryQuestionType)) {
    return normalized as GiftDiscoveryQuestionType;
  }
  const maybeType = normalized.split(":").at(-1);
  return maybeType && QUESTION_TYPES.has(maybeType as GiftDiscoveryQuestionType)
    ? maybeType as GiftDiscoveryQuestionType
    : null;
}

function skippedQuestionId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = compact(value);
  if (!giftDiscoveryQuestionTypeFromId(normalized)) return null;
  return normalized;
}

function budget(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > MAX_BUDGET) return null;
  return Math.round(numeric);
}

function canonicalEnum<T extends string>(value: unknown, allowed: Set<T>): T | null {
  return typeof value === "string" && allowed.has(value as T) ? value as T : null;
}

function pushUnique(target: string[], value: string | null): void {
  if (!value) return;
  const key = value.toLocaleLowerCase();
  if (target.some((item) => item.toLocaleLowerCase() === key)) return;
  target.push(value);
}

function removeMissing(
  missingSignals: readonly GiftRecommendationContext["missingSignals"][number][],
  ...signals: GiftRecommendationContext["missingSignals"][number][]
): GiftRecommendationContext["missingSignals"] {
  const blocked = new Set(signals);
  return missingSignals.filter((signal) => !blocked.has(signal));
}

function answeredQuestions(answers: GiftDiscoveryAnswers): GiftDiscoveryAnsweredQuestion[] {
  return GIFT_DISCOVERY_QUESTION_TYPES
    .filter((type) => answers[type] !== undefined)
    .map((type) => ({ type, answeredAt: null }));
}

export function normalizeGiftDiscoveryRequest(input: {
  discoveryAnswers?: unknown;
  skippedDiscoveryQuestions?: unknown;
}): NormalizedGiftDiscoveryRequest {
  const rawAnswers = input.discoveryAnswers && typeof input.discoveryAnswers === "object"
    ? input.discoveryAnswers as Record<string, unknown>
    : {};
  const answers: GiftDiscoveryAnswers = {};

  for (const [rawKey, rawValue] of Object.entries(rawAnswers)) {
    const type = giftDiscoveryQuestionTypeFromId(rawKey);
    if (!type) continue;

    if (type === "budget") {
      const value = budget(rawValue);
      if (value !== null) answers.budget = value;
    } else if (type === "relationshipStrength") {
      const value = canonicalEnum(rawValue, RELATIONSHIP_STRENGTH);
      if (value) answers.relationshipStrength = value;
    } else if (type === "preferredStyle") {
      const value = canonicalEnum(rawValue, PREFERRED_STYLE);
      if (value) answers.preferredStyle = value;
    } else if (type === "urgency") {
      const value = canonicalEnum(rawValue, URGENCY);
      if (value) answers.urgency = value;
    } else if (type === "dislikedGifts") {
      const value = text(rawValue, MAX_DISLIKED_TEXT_LENGTH);
      if (value) answers.dislikedGifts = value;
    } else {
      const value = text(rawValue);
      if (value) answers[type] = value;
    }
  }

  const skippedQuestionIds = Array.isArray(input.skippedDiscoveryQuestions)
    ? Array.from(new Set(input.skippedDiscoveryQuestions
        .map(skippedQuestionId)
        .filter((item): item is string => Boolean(item))))
    : [];

  return {
    answers,
    skippedQuestionIds,
    answeredQuestions: answeredQuestions(answers),
  };
}

export function applyGiftDiscoveryAnswersToContext(
  context: GiftRecommendationContext,
  answers: GiftDiscoveryAnswers,
): GiftRecommendationContext {
  const next: GiftRecommendationContext = {
    ...context,
    budget: { ...context.budget },
    person: { ...context.person },
    event: { ...context.event },
    preferences: {
      likes: [...context.preferences.likes],
      dislikes: [...context.preferences.dislikes],
      interests: [...context.preferences.interests],
      wishes: [...context.preferences.wishes],
      importantFacts: [...context.preferences.importantFacts],
    },
    memories: context.memories.map((memory) => ({ ...memory })),
    gifts: {
      active: context.gifts.active.map((gift) => ({ ...gift })),
      previous: context.gifts.previous.map((gift) => ({ ...gift })),
      lifecycleCounts: { ...context.gifts.lifecycleCounts },
    },
    duplicateAvoidance: {
      previousGiftValues: [...context.duplicateAvoidance.previousGiftValues],
    },
    missingSignals: [...context.missingSignals],
    discoveryAnswers: { ...answers },
  };

  if (answers.budget !== undefined) {
    next.budget = {
      amount: answers.budget,
      currency: context.budget.currency ?? "PLN",
    };
    next.missingSignals = removeMissing(next.missingSignals, "missing_budget");
  }
  if (answers.interests) {
    pushUnique(next.preferences.interests, answers.interests);
    next.missingSignals = removeMissing(next.missingSignals, "missing_preferences");
  }
  if (answers.hobbies) {
    pushUnique(next.preferences.interests, answers.hobbies);
    next.missingSignals = removeMissing(next.missingSignals, "missing_preferences");
  }
  if (answers.favoriteBrands) {
    pushUnique(next.preferences.likes, answers.favoriteBrands);
    next.missingSignals = removeMissing(next.missingSignals, "missing_preferences");
  }
  if (answers.preferredStyle) {
    pushUnique(next.preferences.wishes, answers.preferredStyle);
    next.missingSignals = removeMissing(next.missingSignals, "missing_preferences");
  }
  if (answers.dislikedGifts) {
    pushUnique(next.preferences.dislikes, answers.dislikedGifts);
    next.missingSignals = removeMissing(next.missingSignals, "missing_dislikes");
  }
  if (answers.relationshipStrength) {
    next.missingSignals = removeMissing(next.missingSignals, "missing_relationship");
  }
  if (answers.urgency) {
    next.missingSignals = removeMissing(next.missingSignals, "missing_event");
  }

  return next;
}
