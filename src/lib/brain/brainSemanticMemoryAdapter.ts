import {
  consumerContent,
  consumerIsActive,
  consumerStoredType,
  consumerValue,
  type KnowledgeItem,
  type KnowledgeKind,
} from "../knowledge/index.ts";
import {
  buildSemanticMemoryProjection,
  type SemanticMemoryTag,
} from "../semantic-memory/index.ts";
import type {
  BrainPerson,
  PersonKnowledge,
  PersonKnowledgeGiftIdea,
} from "./types.ts";

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

interface CompatibilityCategory {
  key: KnowledgeListKey;
  requiredTag: SemanticMemoryTag;
}

/**
 * Semantic Memory intentionally groups several legacy categories under broader
 * tags. This compatibility table only restores the existing PersonKnowledge
 * output bucket after Semantic Memory has classified a source record.
 */
const COMPATIBILITY_CATEGORIES: Readonly<Record<string, CompatibilityCategory>> = {
  general: { key: "interests", requiredTag: "interest" },
  interest: { key: "interests", requiredTag: "interest" },
  preference: { key: "interests", requiredTag: "interest" },
  place: { key: "favoritePlaces", requiredTag: "lifestyle" },
  restaurant: { key: "favoritePlaces", requiredTag: "favorite_food" },
  food: { key: "favoriteFood", requiredTag: "favorite_food" },
  coffee: { key: "favoriteDrinks", requiredTag: "favorite_food" },
  drink: { key: "favoriteDrinks", requiredTag: "favorite_food" },
  hobby: { key: "hobbies", requiredTag: "hobby" },
  book: { key: "books", requiredTag: "book" },
  movie: { key: "movies", requiredTag: "movie" },
  music: { key: "music", requiredTag: "music" },
  pet: { key: "pets", requiredTag: "pet" },
  perfume: { key: "perfumes", requiredTag: "lifestyle" },
  flower: { key: "flowers", requiredTag: "lifestyle" },
  travel: { key: "travel", requiredTag: "travel" },
  sport: { key: "sports", requiredTag: "sport" },
};

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

const KNOWLEDGE_KINDS = new Set<KnowledgeKind>([
  "fact",
  "preference",
  "experience",
  "gift",
  "wish",
  "journal",
  "note",
]);

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

export interface BuildPersonKnowledgeFromSemanticMemoryInput {
  person: BrainPerson;
  knowledge: KnowledgeItem[];
  currentDate?: Date;
}

function normalizedStoredType(item: KnowledgeItem): string {
  try {
    return String(consumerStoredType(item) ?? "").trim().toLocaleLowerCase() || "note";
  } catch {
    return "note";
  }
}

function normalizedValue(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function meaningful(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const result = value.replace(/\s+/g, " ").trim();
  return result || null;
}

function sourceCategory(item: KnowledgeItem, storedType: string): string {
  return meaningful(item.category)?.toLocaleLowerCase() ?? storedType;
}

function dateTimestamp(value: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

function newestFirst(first: KnowledgeItem, second: KnowledgeItem): number {
  return (
    dateTimestamp(second.createdAt) - dateTimestamp(first.createdAt)
    || first.id.localeCompare(second.id)
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

function semanticKind(item: KnowledgeItem, storedType: string): KnowledgeKind {
  if (storedType === "journal") return "journal";
  return KNOWLEDGE_KINDS.has(item.kind) ? item.kind : "note";
}

function semanticValue(item: KnowledgeItem): string | null {
  return (
    meaningful(consumerValue(item))
    ?? meaningful(item.title)
    ?? meaningful(consumerContent(item))
  );
}

/**
 * Build the canonical input expected by Semantic Memory while accepting the
 * legacy-shaped fixtures supported by the existing Brain public boundary.
 */
function toSemanticKnowledgeItem(item: KnowledgeItem): KnowledgeItem {
  const storedType = normalizedStoredType(item);
  const rich = item as KnowledgeItem & Partial<KnowledgeItem>;
  return {
    id: item.id,
    personId: item.personId ?? null,
    eventId: item.eventId ?? null,
    kind: semanticKind(item, storedType),
    category: meaningful(item.category) ?? storedType,
    polarity: item.polarity ?? null,
    title: meaningful(item.title),
    value: semanticValue(item),
    occurredOn: item.occurredOn ?? null,
    importance: Number.isFinite(item.importance) ? item.importance : 0,
    tags: Array.isArray(item.tags) ? [...item.tags] : [],
    summary: meaningful(item.summary),
    // Brain's established boundary is active-only. AI eligibility is not an
    // additional PersonKnowledge filter, so active source records remain visible.
    state: "active",
    aiEligible: true,
    createdAt: item.createdAt ?? null,
    updatedAt: item.updatedAt ?? null,
    legacyType: storedType,
    evidence: rich.evidence ?? {
      sourceKind: "legacy",
      sourceId: item.id,
      originalText: semanticValue(item),
      capturedAt: item.createdAt ?? null,
    },
    classification: rich.classification ?? null,
    compatibility: {
      valueText: item.compatibility?.valueText ?? consumerValue(item),
      contentText: item.compatibility?.contentText ?? consumerContent(item),
    },
  };
}

function currentGiftIdea(item: KnowledgeItem, storedType: string): boolean {
  if (storedType !== "gift") return false;
  if (!item.kind) return true;
  return item.kind === "gift" && item.category !== "given";
}

/** Extract explicit user text only for existing eligible structured types. */
export function extractPersonKnowledgeValue(
  item: KnowledgeItem,
  storedType = normalizedStoredType(item),
): string | null {
  const value = meaningful(consumerValue(item));
  if (value) return value;
  const title = meaningful(item.title);
  if (title) return title;
  const category = sourceCategory(item, storedType);
  if (storedType === "gift" || COMPATIBILITY_CATEGORIES[category]) {
    return meaningful(consumerContent(item));
  }
  return null;
}

/** Count normalized values globally across categories and current gift ideas. */
export function countPersonKnownFacts(knowledge: PersonKnowledge): number {
  const facts = new Set<string>();
  for (const key of KNOWLEDGE_LIST_KEYS) {
    for (const value of knowledge[key]) facts.add(normalizedValue(value));
  }
  for (const gift of knowledge.giftIdeas) facts.add(normalizedValue(gift.value));
  return facts.size;
}

/** Brain profile completeness; deliberately separate from Semantic completeness. */
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
    knowledge.travel.length
    || knowledge.sports.length
    || knowledge.pets.length
    || knowledge.flowers.length
    || knowledge.perfumes.length
  ) {
    score += weights.lifestyle;
  }
  if (knowledge.knownFactsCount >= 5) score += weights.fiveKnownFacts;
  return Math.max(0, Math.min(100, score));
}

export function buildPersonKnowledgeFromSemanticMemory({
  person,
  knowledge: input,
  currentDate = new Date(0),
}: BuildPersonKnowledgeFromSemanticMemoryInput): PersonKnowledge {
  const knowledge = emptyKnowledge(person);
  const eligible = input
    .filter((item) => consumerIsActive(item) && item.personId === person.id)
    .slice()
    .sort(newestFirst);
  const semanticInput = eligible.map(toSemanticKnowledgeItem);
  const projection = buildSemanticMemoryProjection({
    people: [{ id: person.id }],
    knowledge: semanticInput,
    currentDate,
  });
  const personProjection = projection.people.find(
    (candidate) => candidate.personId === person.id,
  );
  const tagsBySourceId = new Map<string, Set<SemanticMemoryTag>>();

  for (const fact of personProjection?.facts ?? []) {
    for (const sourceId of fact.sourceKnowledgeIds) {
      const tags = tagsBySourceId.get(sourceId) ?? new Set<SemanticMemoryTag>();
      for (const tag of fact.tags) tags.add(tag);
      tagsBySourceId.set(sourceId, tags);
    }
  }

  const seenByCategory = new Map<KnowledgeListKey, Set<string>>();
  const seenGifts = new Set<string>();
  const sourceIds = new Set<string>();
  let latestMemoryTimestamp = Number.NEGATIVE_INFINITY;

  for (const item of eligible) {
    const storedType = normalizedStoredType(item);
    const tags = tagsBySourceId.get(item.id);
    if (!tags) continue;

    if (
      tags.has("memory")
      && (storedType === "memory" || storedType === "story")
      && semanticValue(item)
    ) {
      knowledge.memoriesCount += 1;
      sourceIds.add(item.id);
      const relevantDate = isoDate(item.occurredOn) ?? isoDate(item.createdAt);
      const relevantTimestamp = dateTimestamp(relevantDate);
      if (relevantDate && relevantTimestamp > latestMemoryTimestamp) {
        latestMemoryTimestamp = relevantTimestamp;
        knowledge.latestMemoryDate = relevantDate;
      }
      continue;
    }

    const value = extractPersonKnowledgeValue(item, storedType);
    if (!value) continue;
    const normalized = normalizedValue(value);

    if (tags.has("wishlist") && currentGiftIdea(item, storedType)) {
      if (seenGifts.has(normalized)) continue;
      seenGifts.add(normalized);
      const gift: PersonKnowledgeGiftIdea = {
        memoryId: item.id,
        value,
        createdAt: isoDate(item.createdAt),
      };
      knowledge.giftIdeas.push(gift);
      sourceIds.add(item.id);
      continue;
    }

    const compatibility = COMPATIBILITY_CATEGORIES[
      sourceCategory(item, storedType)
    ];
    if (!compatibility || !tags.has(compatibility.requiredTag)) continue;
    const seen = seenByCategory.get(compatibility.key) ?? new Set<string>();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    seenByCategory.set(compatibility.key, seen);
    knowledge[compatibility.key].push(value);
    sourceIds.add(item.id);
  }

  knowledge.sourceMemoryIds = [...sourceIds];
  knowledge.knownFactsCount = countPersonKnownFacts(knowledge);
  knowledge.completenessScore = calculatePersonKnowledgeCompleteness(knowledge);
  return knowledge;
}
