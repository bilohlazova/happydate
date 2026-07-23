import type { KnowledgePolarity, KnowledgeSourceKind } from "../knowledge/domain.ts";

export const SEMANTIC_MEMORY_VERSION = "semantic-memory-v1" as const;
export const SEMANTIC_MEMORY_TAXONOMY_VERSION = "semantic-taxonomy-v1" as const;

export const SEMANTIC_MEMORY_TAGS = [
  "interest",
  "hobby",
  "like",
  "dislike",
  "brand",
  "favorite_color",
  "favorite_food",
  "clothing_size",
  "sport",
  "vehicle",
  "technology",
  "book",
  "movie",
  "music",
  "travel",
  "pet",
  "collection",
  "profession",
  "family",
  "lifestyle",
  "previous_gift",
  "gift_failure",
  "wishlist",
  "important_fact",
  "memory",
] as const;

export type SemanticMemoryTag = (typeof SEMANTIC_MEMORY_TAGS)[number];

export type SemanticFactState = "active" | "conflicting" | "superseded";

export interface SemanticFact {
  id: string;
  personId: string | null;
  value: string;
  normalizedValue: string;
  tags: SemanticMemoryTag[];
  score: number;
  polarity: KnowledgePolarity | null;
  source: KnowledgeSourceKind;
  sourceKnowledgeIds: string[];
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  userConfirmed: boolean;
  state: SemanticFactState;
}

export interface SemanticTimelineItem {
  id: string;
  personId: string | null;
  kind: "memory" | "previous_gift";
  title: string;
  date: string;
  sourceKnowledgeIds: string[];
}

export interface SemanticPersonSummary {
  knownFactCount: number;
  averageScore: number;
  completenessScore: number;
  updatedAt: string | null;
}

export interface PersonSemanticMemoryProjection {
  personId: string;
  facts: SemanticFact[];
  timeline: SemanticTimelineItem[];
  summary: SemanticPersonSummary;
}

export interface SemanticRelationshipEdge {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  relationKey: string | null;
  score: number;
  sourceKnowledgeIds: string[];
}

export interface SemanticMemoryProjection {
  version: typeof SEMANTIC_MEMORY_VERSION;
  taxonomyVersion: typeof SEMANTIC_MEMORY_TAXONOMY_VERSION;
  generatedAt: string;
  people: PersonSemanticMemoryProjection[];
  unassigned: SemanticFact[];
  relationships: SemanticRelationshipEdge[];
}

export interface SemanticMemoryPersonInput {
  id: string;
}
