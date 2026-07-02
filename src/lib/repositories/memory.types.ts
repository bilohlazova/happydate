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
  type: MemoryType;
  title: string | null;
  value_text: string | null;
  occurred_on: string | null;
  importance: number;
  source: MemorySource;
  is_active: boolean;
}