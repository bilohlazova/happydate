import type {
  GiftIntelligenceMissingSignal,
  GiftRecommendationContext,
} from "../gift-intelligence";

export const GIFT_DISCOVERY_QUESTION_TYPES = [
  "budget",
  "relationshipStrength",
  "interests",
  "hobbies",
  "dislikedGifts",
  "preferredStyle",
  "favoriteBrands",
  "urgency",
] as const;

export type GiftDiscoveryQuestionType =
  (typeof GIFT_DISCOVERY_QUESTION_TYPES)[number];

export interface GiftDiscoveryAnsweredQuestion {
  type: GiftDiscoveryQuestionType;
  answeredAt?: string | null;
}

export type GiftDiscoveryRelationshipStrength = "close" | "medium" | "distant";
export type GiftDiscoveryPreferredStyle = "practical" | "emotional" | "elegant";
export type GiftDiscoveryUrgency = "today" | "thisWeek" | "flexible";

export type GiftDiscoveryAnswerValue =
  | string
  | number
  | GiftDiscoveryRelationshipStrength
  | GiftDiscoveryPreferredStyle
  | GiftDiscoveryUrgency;

export type GiftDiscoveryAnswers = Partial<{
  budget: number;
  relationshipStrength: GiftDiscoveryRelationshipStrength;
  interests: string;
  hobbies: string;
  preferredStyle: GiftDiscoveryPreferredStyle;
  favoriteBrands: string;
  dislikedGifts: string;
  urgency: GiftDiscoveryUrgency;
}>;

export interface GiftDiscoveryQuestion {
  id: string;
  type: GiftDiscoveryQuestionType;
  sourceSignal: GiftIntelligenceMissingSignal;
  impact: number;
}

export interface GiftDiscoverySession {
  sessionId: string;
  questions: GiftDiscoveryQuestion[];
  answeredQuestions: GiftDiscoveryAnsweredQuestion[];
  remainingQuestions: GiftDiscoveryQuestion[];
  completionScore: number;
  nextRecommendedQuestion: GiftDiscoveryQuestion | null;
  missingSignals: GiftIntelligenceMissingSignal[];
  locale: string;
}

export interface GiftDiscoveryPromptInput {
  completionScore: number;
  nextRecommendedQuestion: GiftDiscoveryQuestion | null;
  remainingQuestions: GiftDiscoveryQuestion[];
  answeredQuestions: GiftDiscoveryAnsweredQuestion[];
  missingSignals: GiftIntelligenceMissingSignal[];
  locale: string;
}

export interface BuildGiftDiscoverySessionInput {
  context: GiftRecommendationContext;
  followUpQuestions?: readonly string[];
  answeredQuestions?: readonly GiftDiscoveryAnsweredQuestion[];
  skippedQuestions?: readonly string[];
}
