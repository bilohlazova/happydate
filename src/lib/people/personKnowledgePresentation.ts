import type { PersonKnowledge } from "@/lib/brain/types";

export interface PersonKnowledgeChip {
  icon: string;
  value: string;
}

export interface PersonKnowledgeCardModel {
  knownFactsCount: number;
  giftIdeasCount: number;
  memoriesCount: number;
  completenessScore: number;
  chips: PersonKnowledgeChip[];
  remainingChipCount: number;
  hasKnowledge: boolean;
  showGiftSummary: boolean;
  latestMemoryDateLabel: string | null;
}

const CHIP_GROUPS = [
  { key: "interests", icon: "📌" },
  { key: "favoriteDrinks", icon: "☕" },
  { key: "favoritePlaces", icon: "📍" },
  { key: "hobbies", icon: "📷" },
  { key: "movies", icon: "🎬" },
  { key: "books", icon: "📚" },
  { key: "travel", icon: "✈️" },
  { key: "sports", icon: "⚽" },
  { key: "flowers", icon: "🌷" },
  { key: "perfumes", icon: "✨" },
  { key: "favoriteFood", icon: "🍜" },
  { key: "music", icon: "🎵" },
  { key: "pets", icon: "🐾" },
] as const satisfies ReadonlyArray<{
  key: keyof Pick<
    PersonKnowledge,
    | "interests"
    | "favoriteDrinks"
    | "favoritePlaces"
    | "hobbies"
    | "movies"
    | "books"
    | "travel"
    | "sports"
    | "flowers"
    | "perfumes"
    | "favoriteFood"
    | "music"
    | "pets"
  >;
  icon: string;
}>;

const MAX_KNOWLEDGE_CHIPS = 6;

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

export function getPersonKnowledgeChips(
  knowledge: PersonKnowledge,
): { chips: PersonKnowledgeChip[]; remainingCount: number } {
  const allChips: PersonKnowledgeChip[] = [];
  const seen = new Set<string>();

  for (const group of CHIP_GROUPS) {
    for (const rawValue of knowledge[group.key]) {
      const value = rawValue.replace(/\s+/g, " ").trim();
      const normalized = normalize(value);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      allChips.push({ icon: group.icon, value });
    }
  }

  return {
    chips: allChips.slice(0, MAX_KNOWLEDGE_CHIPS),
    remainingCount: Math.max(0, allChips.length - MAX_KNOWLEDGE_CHIPS),
  };
}

export function formatPersonKnowledgeDate(value: string): string | null {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function getPersonKnowledgeCardModel(
  knowledge: PersonKnowledge,
): PersonKnowledgeCardModel {
  const { chips, remainingCount } = getPersonKnowledgeChips(knowledge);
  return {
    knownFactsCount: knowledge.knownFactsCount,
    giftIdeasCount: knowledge.giftIdeas.length,
    memoriesCount: knowledge.memoriesCount,
    completenessScore: knowledge.completenessScore,
    chips,
    remainingChipCount: remainingCount,
    hasKnowledge: knowledge.knownFactsCount > 0 || knowledge.memoriesCount > 0,
    showGiftSummary: knowledge.giftIdeas.length > 0,
    latestMemoryDateLabel:
      knowledge.memoriesCount > 0 && knowledge.latestMemoryDate
        ? formatPersonKnowledgeDate(knowledge.latestMemoryDate)
        : null,
  };
}
