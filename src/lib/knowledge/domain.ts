/**
 * Canonical, persistence-agnostic contracts for Happy Knowledge System 1.0.
 *
 * These types deliberately do not mirror the `memories` table. Memory is an
 * input/evidence source; Knowledge is the normalized domain read model.
 */

export const KNOWLEDGE_KINDS = [
  "fact",
  "preference",
  "experience",
  "gift",
  "wish",
  "journal",
  "note",
] as const;

export type KnowledgeKind = (typeof KNOWLEDGE_KINDS)[number];

export type KnowledgePolarity =
  | "likes"
  | "dislikes"
  | "avoids"
  | "prefers"
  | "neutral";

export type KnowledgeSourceKind =
  | "manual"
  | "ai"
  | "chat"
  | "import"
  | "legacy"
  | (string & {});

export type KnowledgeState =
  | "proposed"
  | "confirmed"
  | "active"
  | "superseded"
  | "archived";

export interface KnowledgeEvidence {
  sourceKind: KnowledgeSourceKind;
  sourceId: string;
  originalText: string | null;
  capturedAt: string | null;
}

export interface KnowledgeClassification {
  confidence: number | null;
  classifierVersion: string | null;
  classifiedAt: string | null;
  userConfirmed: boolean;
}

/**
 * One canonical knowledge item. It is safe to derive this from legacy data:
 * the original stored type and evidence remain attached to the item.
 */
export interface KnowledgeItem {
  id: string;
  personId: string | null;
  eventId: string | null;
  kind: KnowledgeKind;
  category: string | null;
  polarity: KnowledgePolarity | null;
  title: string | null;
  value: string | null;
  occurredOn: string | null;
  importance: number;
  tags: string[];
  summary: string | null;
  state: KnowledgeState;
  aiEligible: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  legacyType: string;
  evidence: KnowledgeEvidence;
  classification: KnowledgeClassification | null;
  /** Raw values retained only to preserve legacy consumer behavior in migration. */
  compatibility: {
    valueText: string | null;
    contentText: string | null;
  };
}

export interface PersonKnowledgeProfile {
  personId: string;
  items: KnowledgeItem[];
  facts: KnowledgeItem[];
  preferences: KnowledgeItem[];
  experiences: KnowledgeItem[];
  gifts: KnowledgeItem[];
  wishes: KnowledgeItem[];
}

export interface KnowledgeSnapshot {
  items: KnowledgeItem[];
  byPersonId: ReadonlyMap<string, PersonKnowledgeProfile>;
  unassigned: KnowledgeItem[];
}

export interface KnowledgeContextOptions {
  personIds?: readonly string[];
  limit?: number;
}
