// src/lib/memories/memoryIcons.ts

export const MEMORY_ICONS: Record<string, string> = {
  memory: "📝",

  gift: "🎁",

  preference: "❤️",

  note: "📌",

  coffee: "☕",

  food: "🍽️",

  restaurant: "🍴",

  place: "📍",

  travel: "✈️",

  flower: "🌷",

  movie: "🎬",

  music: "🎵",

  book: "📚",

  hobby: "🎨",

  sport: "⚽",

  pet: "🐶",

  family: "👨‍👩‍👧",

  work: "💼",

  birthday: "🎂",

  holiday: "🎉",

  dream: "✨",

  default: "📝",
};

export function getMemoryIcon(type: string): string {
  return MEMORY_ICONS[type] ?? MEMORY_ICONS.default;
}