import type { PersonGender, PersonRelationKey } from "../repositories/person.types.ts";
import type { GiftLifecycle } from "../gifts/gift.types.ts";

export const GIFT_INTELLIGENCE_MISSING_SIGNALS = [
  "missing_person",
  "missing_event",
  "missing_relationship",
  "missing_gender",
  "missing_age",
  "missing_budget",
  "missing_preferences",
  "missing_dislikes",
  "missing_memories",
  "missing_previous_gifts",
] as const;

export type GiftIntelligenceMissingSignal =
  (typeof GIFT_INTELLIGENCE_MISSING_SIGNALS)[number];

export const GIFT_SEASON_SIGNALS = [
  "new_year",
  "valentines_day",
  "easter",
  "mothers_day",
  "fathers_day",
  "childrens_day",
  "christmas",
  "none",
] as const;

export type GiftSeasonSignal = (typeof GIFT_SEASON_SIGNALS)[number];

export interface GiftIntelligencePersonInput {
  id: string;
  name?: string | null;
  relationKey?: PersonRelationKey | null;
  relationship?: string | null;
  gender?: PersonGender | null;
  birthday?: string | null;
}

export interface GiftIntelligenceEventInput {
  id: string | null;
  category: string | null;
  date: string | null;
  personId?: string | null;
}

export interface GiftIntelligenceKnowledgeInput {
  id: string;
  personId: string | null;
  eventId?: string | null;
  kind: string;
  category: string | null;
  polarity?: string | null;
  value: string | null;
  title?: string | null;
  summary?: string | null;
  occurredOn?: string | null;
  createdAt?: string | null;
  state?: string | null;
  aiEligible?: boolean;
}

export interface GiftIntelligenceGiftInput {
  id: string;
  lifecycle: GiftLifecycle;
  personId: string | null;
  eventId: string | null;
  value: string;
  occurredOn: string | null;
  createdAt: string | null;
  sourceKnowledgeId?: string | null;
}

export interface GiftBudgetInput {
  amount: number | null;
  currency: string | null;
}

export interface GiftRecommendationContext {
  locale: string;
  generatedAt: string;
  person: {
    id: string | null;
    relationKey: PersonRelationKey | null;
    gender: PersonGender | null;
    age: number | null;
  };
  event: {
    id: string | null;
    category: string | null;
    date: string | null;
    daysUntil: number | null;
  };
  budget: {
    amount: number | null;
    currency: string | null;
  };
  season: GiftSeasonSignal;
  preferences: {
    likes: string[];
    dislikes: string[];
    interests: string[];
    wishes: string[];
    importantFacts: string[];
  };
  knowledge: {
    interests: string[];
    hobbies: string[];
    favoriteBrands: string[];
    dislikedGifts: string[];
    preferredStyles: string[];
  };
  memories: Array<{
    id: string;
    value: string;
    occurredOn: string | null;
  }>;
  gifts: {
    active: Array<{
      id: string;
      lifecycle: Exclude<GiftLifecycle, "given">;
      value: string;
    }>;
    previous: Array<{
      id: string;
      value: string;
      occurredOn: string | null;
    }>;
    lifecycleCounts: Record<GiftLifecycle, number>;
  };
  duplicateAvoidance: {
    previousGiftValues: string[];
  };
  missingSignals: GiftIntelligenceMissingSignal[];
  discoveryAnswers?: {
    budget?: number;
    relationshipStrength?: "close" | "medium" | "distant";
    interests?: string;
    hobbies?: string;
    preferredStyle?: "practical" | "emotional" | "elegant";
    favoriteBrands?: string;
    dislikedGifts?: string;
    urgency?: "today" | "thisWeek" | "flexible";
  };
}

export interface BuildGiftRecommendationContextInput {
  person?: GiftIntelligencePersonInput | null;
  event?: GiftIntelligenceEventInput | null;
  knowledge?: readonly GiftIntelligenceKnowledgeInput[];
  gifts?: readonly GiftIntelligenceGiftInput[];
  budget?: GiftBudgetInput | null;
  locale: string;
  currentDate?: Date;
}

export const GIFT_RECOMMENDATION_CATEGORIES = [
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
] as const;

export type GiftRecommendationCategory =
  (typeof GIFT_RECOMMENDATION_CATEGORIES)[number];

export const GIFT_RECOMMENDATION_CONFIDENCE = ["low", "medium", "high"] as const;

export type GiftRecommendationConfidence =
  (typeof GIFT_RECOMMENDATION_CONFIDENCE)[number];

export const GIFT_PERSONALIZATION_SIGNALS = [
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
] as const;

export type GiftPersonalizationSignal =
  (typeof GIFT_PERSONALIZATION_SIGNALS)[number];

export const GIFT_RECOMMENDATION_CAUTIONS = [
  "price_uncertain",
  "limited_context",
  "legacy_fallback",
  "verify_availability",
] as const;

export type GiftRecommendationCaution =
  (typeof GIFT_RECOMMENDATION_CAUTIONS)[number];

export interface GiftRecommendationSuggestion {
  title: string;
  category: GiftRecommendationCategory;
  why: string;
  confidence: GiftRecommendationConfidence;
  estimatedPrice: number | null;
  currency: string | null;
  personalizationSignals: GiftPersonalizationSignal[];
  cautions: GiftRecommendationCaution[];
}

export interface GiftRecommendationAiResponse {
  suggestions: GiftRecommendationSuggestion[];
  followUpQuestions: string[];
}

export interface GiftRecommendationAiPayload<Discovery = unknown> {
  context: GiftRecommendationContext;
  discovery: Discovery;
}

export interface GiftRecommendationValidationDiagnostics {
  generatedCount: number;
  duplicateRejectedCount: number;
  budgetRejectedCount: number;
  missingSignalsCount: number;
  completionScore?: number;
  remainingQuestionCount?: number;
  answeredQuestionCount?: number;
  followUpQuestionCount?: number;
  locale: string;
  repairAttempted: boolean;
}

export interface GiftRecommendationValidationResult {
  suggestions: GiftRecommendationSuggestion[];
  followUpQuestions: string[];
  diagnostics: GiftRecommendationValidationDiagnostics;
  validationErrors: string[];
}

export interface GiftLegacyIdea {
  title: string;
  explanation: string;
  why: string;
  price_range: string;
}
