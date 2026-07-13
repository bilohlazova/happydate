// src/lib/repositories/memory.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Local types for the Memory Repository ONLY.
// These are hand-written to match the `public.memories` table columns
// (see migration: extend_memories_universal_type_system).
// This is intentionally NOT a generated/global Supabase types file —
// it exists solely to give memoryRepository.ts a typed contract.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Free-form memory type. Stored as plain `text` in the database so new
 * types (e.g. "vacation", "allergy") can be introduced without a migration.
 * These are the known/common types (editor autocomplete), but the type
 * stays open via `(string & {})` so any new value is still accepted.
 */
export const MEMORY_TYPES = {
  GIFT: "gift",
  PREFERENCE: "preference",
  MEMORY: "memory",
  NOTE: "note",
} as const;

export type MemoryType =
  | (typeof MEMORY_TYPES)[keyof typeof MEMORY_TYPES]
  | (string & {});

/**
 * Future-facing classification used by application features. It is separate
 * from the raw, legacy-compatible value stored in `memories.type`.
 */
export type MemoryKind = "note" | "person_info" | "memory" | "journal";

/**
 * Raw database value. Production rows may predate defaults and constraints,
 * so consumers must tolerate null and arbitrary non-empty strings.
 */
export type StoredMemoryType = string | null;

export interface MemoryKindConfig {
  kind: MemoryKind;
  labelKey: string;
  descriptionKey: string;
  icon: string;
}

/**
 * Code-level metadata for future MemoryKind-based UI. Legacy type icons stay
 * in their existing registry until consumers are intentionally migrated.
 */
export const MEMORY_KIND_CONFIG = {
  note: {
    kind: "note",
    labelKey: "memory.kind.note.label",
    descriptionKey: "memory.kind.note.description",
    icon: "note",
  },
  person_info: {
    kind: "person_info",
    labelKey: "memory.kind.person_info.label",
    descriptionKey: "memory.kind.person_info.description",
    icon: "person_info",
  },
  memory: {
    kind: "memory",
    labelKey: "memory.kind.memory.label",
    descriptionKey: "memory.kind.memory.description",
    icon: "memory",
  },
  journal: {
    kind: "journal",
    labelKey: "memory.kind.journal.label",
    descriptionKey: "memory.kind.journal.description",
    icon: "journal",
  },
} as const satisfies Record<MemoryKind, MemoryKindConfig>;

const PERSON_INFO_STORED_TYPES = new Set([
  "gift",
  "preference",
  "flower",
  "coffee",
  "restaurant",
  "food",
  "movie",
  "book",
  "music",
  "hobby",
  "perfume",
  "travel",
  "sport",
  "pet",
  "family",
  "work",
  "birthday",
  "holiday",
  "dream",
]);

/**
 * Normalize a raw stored type without restricting or rewriting unknown legacy
 * values. Invalid or missing input safely falls back to `note`.
 */
export function normalizeStoredMemoryType(rawType: unknown): string {
  try {
    const normalized = String(rawType ?? "").trim().toLowerCase();
    return normalized || "note";
  } catch {
    return "note";
  }
}

/**
 * Classify a raw stored value into one of the future high-level kinds while
 * leaving existing Brain and People classification behavior untouched.
 */
export function getMemoryKind(rawType: unknown): MemoryKind {
  const normalizedType = normalizeStoredMemoryType(rawType);

  if (normalizedType === "memory" || normalizedType === "story") {
    return "memory";
  }

  if (normalizedType === "journal") {
    return "journal";
  }

  if (PERSON_INFO_STORED_TYPES.has(normalizedType)) {
    return "person_info";
  }

  return "note";
}

/**
 * Where a memory record originated from.
 */
export type MemorySource = "manual" | "ai" | "chat" | "import" | string;

/**
 * Row shape of `public.memories`, exactly as returned by Supabase.
 */
export interface MemoryRow {
  id: string;
  user_id: string;
  person_id: string | null;
  event_id: string | null;
  content_text: string | null;
  audio_url: string | null;
  transcript_text: string | null;
  images: string[] | null;
  ai_summary: string | null;
  ai_tags: string[] | null;
  ai_emotional_score: number | null;
  created_at: string | null;
  updated_at: string | null;
  type: StoredMemoryType;
  title: string | null;
  value_text: string | null;
  occurred_on: string | null;
  importance: number;
  source: MemorySource;
  is_active: boolean;
}

/**
 * Projection used by the Notes screen. Kept separate from MemoryRow because
 * the screen intentionally fetches only the columns it renders.
 */
export interface NotesMemoryRow {
  id: string;
  content_text: string | null;
  created_at: string;
  person_id: string | null;
  images: string[] | null;
  ai_tags: string[] | null;
  ai_summary: string | null;
}

/**
 * Minimal person projection needed to associate and filter Notes memories.
 */
export interface NotesMemoryPerson {
  id: string;
  name: string;
  relation: string | null;
}
