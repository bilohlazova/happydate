import type { AssistantChatLocale } from "../assistant/chatContract.ts";
import type { KnowledgePolarity } from "../knowledge/index.ts";
import type { SemanticMemoryTag } from "../semantic-memory/index.ts";

export const HAPPY_LEARNING_CAPTURE_TYPES = [
  "preference",
  "interest",
  "hobby",
  "dislike",
  "favorite",
  "wish",
  "personal_fact",
  "experience",
  "gift_idea",
] as const;

export type HappyLearningCaptureType = (typeof HAPPY_LEARNING_CAPTURE_TYPES)[number];

export type HappyLearningDecision = {
  statementStatus: "explicit" | "uncertain" | "question" | "inferred";
  durability: "long_term" | "temporary" | "unknown";
  usefulness: "future_relevant" | "one_time" | "unknown";
  safety: "supported" | "sensitive" | "unsupported";
};

export type HappyLearningCandidate = {
  captureType: HappyLearningCaptureType;
  value: string;
  polarity: KnowledgePolarity | null;
  semanticTags: SemanticMemoryTag[];
  evidenceText: string;
  decision: HappyLearningDecision;
  /** Diagnostic extraction signal only; never an eligibility gate. */
  confidence: number | null;
};

export type HappyLearningExtractorInput = {
  userMessage: string;
  locale: AssistantChatLocale;
  resolvedPerson: {
    id: string;
    name: string;
  };
};

export type HappyLearningExtractionResult = {
  candidates: HappyLearningCandidate[];
};

export type HappyLearningProviderInput = {
  userMessage: string;
  locale: AssistantChatLocale;
  resolvedPersonName: string;
  allowedCaptureTypes: readonly HappyLearningCaptureType[];
  allowedSemanticTags: readonly SemanticMemoryTag[];
  maxCandidates: number;
};

export type HappyLearningStructuredProvider = (
  input: HappyLearningProviderInput,
) => Promise<unknown>;
