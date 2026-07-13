import type { NotesMemoryRow } from "../src/lib/repositories/memory.types";

const legacyNotesRowWithNullableType: NotesMemoryRow = {
  id: "memory-id",
  content_text: "Legacy note",
  created_at: "2026-07-13T00:00:00.000Z",
  person_id: null,
  images: null,
  ai_tags: null,
  ai_summary: null,
  type: null,
  title: null,
  value_text: null,
  occurred_on: null,
};

void legacyNotesRowWithNullableType;
