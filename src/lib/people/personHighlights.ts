// src/lib/people/personHighlights.ts

import type { MemoryRow } from "@/lib/repositories/memory.types";

export interface PersonHighlight {
  id: string;
  title: string;
  value: string;
  icon: string;
}

const HIGHLIGHT_TYPES = [
  {
    id: "coffee",
    title: "Ulubiona kawa",
    icon: "☕",
  },
  {
    id: "food",
    title: "Ulubione jedzenie",
    icon: "🍽️",
  },
  {
    id: "restaurant",
    title: "Restauracje",
    icon: "🍴",
  },
  {
    id: "place",
    title: "Miejsca",
    icon: "📍",
  },
  {
    id: "flower",
    title: "Kwiaty",
    icon: "🌷",
  },
  {
    id: "movie",
    title: "Filmy",
    icon: "🎬",
  },
  {
    id: "music",
    title: "Muzyka",
    icon: "🎵",
  },
  {
    id: "book",
    title: "Książki",
    icon: "📚",
  },
  {
    id: "hobby",
    title: "Hobby",
    icon: "🎨",
  },
];

export function getPersonHighlights(
  memories: MemoryRow[] = []
): PersonHighlight[] {
  const safeMemories = memories ?? [];

  return HIGHLIGHT_TYPES.flatMap((item) => {
    const memory = safeMemories.find(
      (m) =>
        m.type === item.id &&
        (m.value_text || m.content_text)
    );

    if (!memory) {
      return [];
    }

    return [
      {
        id: item.id,
        title: item.title,
        icon: item.icon,
        value:
          memory.value_text ??
          memory.content_text ??
          "",
      },
    ];
  });
}