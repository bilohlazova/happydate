// src/lib/people/highlights.ts

import type { MemoryRow } from "@/lib/repositories/memory.types";

export interface PersonHighlight {
  id: string;
  icon: string;
  label: string;
}

const HIGHLIGHT_ICONS: Record<string, string> = {
  coffee: "☕",
  flower: "🌷",
  food: "🍽️",
  place: "📍",
  travel: "✈️",
  movie: "🎬",
  music: "🎵",
  hobby: "🎨",
  book: "📚",
  gift: "🎁",
  preference: "⭐",
  memory: "💭",
};

export function buildPersonHighlights(
  memories: MemoryRow[]
): PersonHighlight[] {
  const unique = new Map<string, PersonHighlight>();

  for (const memory of memories) {
    if (!memory.value_text) {
      continue;
    }

    // We keep only one highlight per memory type.
    if (unique.has(memory.type)) {
      continue;
    }

    unique.set(memory.type, {
      id: memory.type,
      icon: HIGHLIGHT_ICONS[memory.type] ?? "💡",
      label: memory.value_text,
    });
  }

  return [...unique.values()];
}