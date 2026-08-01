import type { KnowledgeItem } from "../knowledge/index.ts";
import type { SemanticMemoryProjection } from "../semantic-memory/index.ts";
import type { HappyLearningCandidate } from "./happyLearning.types.ts";

export type HappyLearningSemanticStatus = "new" | "already_known" | "conflict";

export type HappyLearningSemanticCheckReason =
  | "no_match"
  | "same_semantic_fact"
  | "same_value_same_polarity"
  | "opposite_polarity"
  | "ambiguous_semantic_match";

export type HappyLearningSemanticCheckInput = {
  personId: string;
  candidate: HappyLearningCandidate;
  knowledge: readonly KnowledgeItem[];
  semanticMemory: SemanticMemoryProjection;
};

export type HappyLearningSemanticCheckResult = {
  status: HappyLearningSemanticStatus;
  matchedKnowledgeIds: string[];
  conflictingKnowledgeIds: string[];
  reason: HappyLearningSemanticCheckReason;
};
