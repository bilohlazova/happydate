import {
  normalizeStoredMemoryType,
  type MemoryRow,
} from "../repositories/memory.types.ts";
import type {
  KnowledgeItem,
  KnowledgeKind,
  KnowledgePolarity,
  KnowledgeState,
} from "./domain.ts";

interface LegacySemantics {
  kind: KnowledgeKind;
  category: string | null;
  polarity: KnowledgePolarity | null;
}

const PREFERENCE_CATEGORIES: Readonly<Record<string, string>> = {
  preference: "general",
  interest: "interest",
  flower: "flower",
  coffee: "coffee",
  drink: "drink",
  restaurant: "restaurant",
  place: "place",
  food: "food",
  movie: "movie",
  book: "book",
  music: "music",
  hobby: "hobby",
  perfume: "perfume",
  travel: "travel",
  sport: "sport",
  pet: "pet",
};

const FACT_CATEGORIES: Readonly<Record<string, string>> = {
  family: "family",
  work: "work",
  birthday: "important_date",
  holiday: "important_date",
  personal_fact: "general",
};

function legacySemantics(type: string): LegacySemantics {
  if (type === "memory" || type === "story") {
    return { kind: "experience", category: null, polarity: null };
  }

  if (type === "gift") {
    // Existing records represent ideas, not proof of purchase or giving.
    return { kind: "gift", category: "idea", polarity: null };
  }

  if (type === "dream") {
    return { kind: "wish", category: "dream", polarity: null };
  }

  if (type === "journal") {
    return { kind: "journal", category: null, polarity: null };
  }

  const preferenceCategory = PREFERENCE_CATEGORIES[type];
  if (preferenceCategory) {
    return {
      kind: "preference",
      category: preferenceCategory,
      // Legacy records do not encode positive/negative intent reliably.
      polarity: null,
    };
  }

  const factCategory = FACT_CATEGORIES[type];
  if (factCategory) {
    return { kind: "fact", category: factCategory, polarity: null };
  }

  return { kind: "note", category: null, polarity: null };
}

function taggedPolarity(row: MemoryRow): KnowledgePolarity | null {
  if (row.source !== "chat_message") return null;
  const tags = new Set(row.ai_tags ?? []);
  if (tags.has("dislike")) return "dislikes";
  if (tags.has("like")) return "likes";
  return null;
}

function cleanText(value: string | null): string | null {
  const cleaned = value?.trim() ?? "";
  return cleaned || null;
}

function canonicalValue(row: MemoryRow): string | null {
  return (
    cleanText(row.value_text) ??
    cleanText(row.content_text) ??
    cleanText(row.transcript_text) ??
    cleanText(row.title)
  );
}

function knowledgeState(row: MemoryRow): KnowledgeState {
  return row.is_active ? "active" : "archived";
}

/**
 * Convert one current/legacy database row into the Knowledge 1.0 read model.
 * This is intentionally lossless with respect to legacy type and evidence and
 * never mutates the supplied row.
 */
export function mapLegacyMemoryToKnowledge(row: MemoryRow): KnowledgeItem {
  const type = normalizeStoredMemoryType(row.type);
  const semantics = legacySemantics(type);
  const originalText =
    cleanText(row.content_text) ??
    cleanText(row.transcript_text) ??
    cleanText(row.value_text) ??
    cleanText(row.title);

  return {
    id: row.id,
    personId: row.person_id,
    eventId: row.event_id,
    kind: semantics.kind,
    category: semantics.category,
    polarity: semantics.polarity ?? taggedPolarity(row),
    title: cleanText(row.title),
    value: canonicalValue(row),
    occurredOn: row.occurred_on,
    importance: Number.isFinite(row.importance) ? row.importance : 0,
    tags: [...(row.ai_tags ?? [])],
    summary: cleanText(row.ai_summary),
    state: knowledgeState(row),
    // Journals are private by default. Other inactive records are not eligible.
    aiEligible: row.is_active && semantics.kind !== "journal",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    legacyType: type,
    evidence: {
      sourceKind: row.source || "legacy",
      sourceId: row.source_record_id ?? row.id,
      originalText: cleanText(row.source_excerpt) ?? originalText,
      capturedAt: row.user_confirmed_at ?? row.created_at,
    },
    classification: row.user_confirmed_at ? {
      confidence: null,
      classifierVersion: row.capture_schema_version,
      classifiedAt: row.user_confirmed_at,
      userConfirmed: true,
    } : null,
    review: {
      reviewedAt: row.knowledge_reviewed_at,
      snoozedUntil: row.knowledge_review_snoozed_until,
    },
    compatibility: {
      valueText: row.value_text,
      contentText: row.content_text,
    },
  };
}

export function mapLegacyMemoriesToKnowledge(
  rows: readonly MemoryRow[]
): KnowledgeItem[] {
  return rows.map(mapLegacyMemoryToKnowledge);
}
