import { normalizeStoredMemoryType } from "../../repositories/memory.types.ts";
import type {
  BrainMemory,
  BrainPerson,
  PersonKnowledge,
  PersonKnowledgeGiftIdea,
} from "../types";

type KnowledgeListKey =
  | "interests"
  | "favoritePlaces"
  | "favoriteFood"
  | "favoriteDrinks"
  | "hobbies"
  | "books"
  | "movies"
  | "music"
  | "pets"
  | "perfumes"
  | "flowers"
  | "travel"
  | "sports";

const TYPE_TO_CATEGORY: Readonly<Record<string, KnowledgeListKey>> = {
  interest: "interests",
  preference: "interests",
  place: "favoritePlaces",
  restaurant: "favoritePlaces",
  food: "favoriteFood",
  coffee: "favoriteDrinks",
  drink: "favoriteDrinks",
  hobby: "hobbies",
  book: "books",
  movie: "movies",
  music: "music",
  pet: "pets",
  perfume: "perfumes",
  flower: "flowers",
  travel: "travel",
  sport: "sports",
};

const MEMORY_RECORD_TYPES = new Set(["memory", "story"]);
const KNOWLEDGE_LIST_KEYS = Object.freeze([
  "interests",
  "favoritePlaces",
  "favoriteFood",
  "favoriteDrinks",
  "hobbies",
  "books",
  "movies",
  "music",
  "pets",
  "perfumes",
  "flowers",
  "travel",
  "sports",
] as const satisfies readonly KnowledgeListKey[]);

export const PERSON_KNOWLEDGE_COMPLETENESS_WEIGHTS = Object.freeze({
  interest: 15,
  hobby: 10,
  foodOrDrink: 10,
  place: 10,
  entertainment: 10,
  giftIdea: 15,
  sharedMemory: 15,
  lifestyle: 10,
  fiveKnownFacts: 5,
});

export interface BuildPersonKnowledgeInput {
  person: BrainPerson;
  memories: BrainMemory[];
  currentDate?: Date;
}

export interface BuildAllPeopleKnowledgeInput {
  people: BrainPerson[];
  memories: BrainMemory[];
  currentDate?: Date;
}

function normalizedValue(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function meaningful(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const result = value.replace(/\s+/g, " ").trim();
  return result || null;
}

/** Extract explicit user text only for already-approved structured types. */
export function extractPersonKnowledgeValue(
  memory: BrainMemory,
  normalizedType = normalizeStoredMemoryType(memory.type),
): string | null {
  const value = meaningful(memory.value);
  if (value) return value;
  const title = meaningful(memory.title);
  if (title) return title;
  if (normalizedType === "gift" || TYPE_TO_CATEGORY[normalizedType]) {
    return meaningful(memory.content);
  }
  return null;
}

function dateTimestamp(value: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

function newestRecordTimestamp(memory: BrainMemory): number {
  return dateTimestamp(memory.createdAt);
}

function newestFirst(first: BrainMemory, second: BrainMemory): number {
  return (
    newestRecordTimestamp(second) - newestRecordTimestamp(first) ||
    first.id.localeCompare(second.id)
  );
}

function isoDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function emptyKnowledge(person: BrainPerson): PersonKnowledge {
  return {
    personId: person.id,
    ...(meaningful(person.name) ? { personName: meaningful(person.name)! } : {}),
    interests: [],
    favoritePlaces: [],
    favoriteFood: [],
    favoriteDrinks: [],
    hobbies: [],
    books: [],
    movies: [],
    music: [],
    pets: [],
    perfumes: [],
    flowers: [],
    travel: [],
    sports: [],
    giftIdeas: [],
    memoriesCount: 0,
    latestMemoryDate: null,
    knownFactsCount: 0,
    completenessScore: 0,
    sourceMemoryIds: [],
  };
}

/** Count normalized values globally across categories and gift ideas. */
export function countPersonKnownFacts(knowledge: PersonKnowledge): number {
  const facts = new Set<string>();
  for (const key of KNOWLEDGE_LIST_KEYS) {
    for (const value of knowledge[key]) facts.add(normalizedValue(value));
  }
  for (const gift of knowledge.giftIdeas) facts.add(normalizedValue(gift.value));
  return facts.size;
}

/** Profile-data completeness only; this is not relationship strength. */
export function calculatePersonKnowledgeCompleteness(
  knowledge: PersonKnowledge,
): number {
  const weights = PERSON_KNOWLEDGE_COMPLETENESS_WEIGHTS;
  let score = 0;
  if (knowledge.interests.length) score += weights.interest;
  if (knowledge.hobbies.length) score += weights.hobby;
  if (knowledge.favoriteFood.length || knowledge.favoriteDrinks.length) {
    score += weights.foodOrDrink;
  }
  if (knowledge.favoritePlaces.length) score += weights.place;
  if (knowledge.books.length || knowledge.movies.length || knowledge.music.length) {
    score += weights.entertainment;
  }
  if (knowledge.giftIdeas.length) score += weights.giftIdea;
  if (knowledge.memoriesCount > 0) score += weights.sharedMemory;
  if (
    knowledge.travel.length ||
    knowledge.sports.length ||
    knowledge.pets.length ||
    knowledge.flowers.length ||
    knowledge.perfumes.length
  ) {
    score += weights.lifestyle;
  }
  if (knowledge.knownFactsCount >= 5) score += weights.fiveKnownFacts;
  return Math.max(0, Math.min(100, score));
}

export function buildPersonKnowledge({
  person,
  memories,
}: BuildPersonKnowledgeInput): PersonKnowledge {
  const knowledge = emptyKnowledge(person);
  const seenByCategory = new Map<KnowledgeListKey, Set<string>>();
  const seenGifts = new Set<string>();
  const sourceIds = new Set<string>();
  let latestMemoryTimestamp = Number.NEGATIVE_INFINITY;

  const eligible = memories
    .filter((memory) => memory.isActive && memory.personId === person.id)
    .slice()
    .sort(newestFirst);

  for (const memory of eligible) {
    const type = normalizeStoredMemoryType(memory.type);
    if (MEMORY_RECORD_TYPES.has(type)) {
      if (!meaningful(memory.value) && !meaningful(memory.title) && !meaningful(memory.content)) {
        continue;
      }
      knowledge.memoriesCount += 1;
      sourceIds.add(memory.id);
      const relevantDate = isoDate(memory.occurredOn) ?? isoDate(memory.createdAt);
      const relevantTimestamp = dateTimestamp(relevantDate);
      if (relevantDate && relevantTimestamp > latestMemoryTimestamp) {
        latestMemoryTimestamp = relevantTimestamp;
        knowledge.latestMemoryDate = relevantDate;
      }
      continue;
    }

    const value = extractPersonKnowledgeValue(memory, type);
    if (!value) continue;
    const normalized = normalizedValue(value);

    if (type === "gift") {
      if (seenGifts.has(normalized)) continue;
      seenGifts.add(normalized);
      const gift: PersonKnowledgeGiftIdea = {
        memoryId: memory.id,
        value,
        createdAt: isoDate(memory.createdAt),
      };
      knowledge.giftIdeas.push(gift);
      sourceIds.add(memory.id);
      continue;
    }

    const category = TYPE_TO_CATEGORY[type];
    if (!category) continue;
    const seen = seenByCategory.get(category) ?? new Set<string>();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    seenByCategory.set(category, seen);
    knowledge[category].push(value);
    sourceIds.add(memory.id);
  }

  knowledge.sourceMemoryIds = [...sourceIds];
  knowledge.knownFactsCount = countPersonKnownFacts(knowledge);
  knowledge.completenessScore = calculatePersonKnowledgeCompleteness(knowledge);
  return knowledge;
}

export function buildAllPeopleKnowledge({
  people,
  memories,
  currentDate,
}: BuildAllPeopleKnowledgeInput): PersonKnowledge[] {
  const memoriesByPerson = new Map<string, BrainMemory[]>();
  for (const memory of memories) {
    if (!memory.personId) continue;
    const group = memoriesByPerson.get(memory.personId) ?? [];
    group.push(memory);
    memoriesByPerson.set(memory.personId, group);
  }
  return people.map((person) =>
    buildPersonKnowledge({
      person,
      memories: memoriesByPerson.get(person.id) ?? [],
      currentDate,
    }),
  );
}
