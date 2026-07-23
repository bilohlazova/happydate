import type { KnowledgeItem, KnowledgePolarity } from "../knowledge/domain.ts";
import type { SemanticMemoryTag } from "./semanticMemory.types.ts";

const CATEGORY_TAGS: Readonly<Record<string, readonly SemanticMemoryTag[]>> = {
  interest: ["interest"],
  hobby: ["hobby", "interest"],
  brand: ["brand"],
  favorite_brand: ["brand"],
  color: ["favorite_color"],
  favourite_color: ["favorite_color"],
  favorite_color: ["favorite_color"],
  food: ["favorite_food"],
  restaurant: ["favorite_food"],
  coffee: ["favorite_food"],
  drink: ["favorite_food"],
  clothing_size: ["clothing_size"],
  size: ["clothing_size"],
  sport: ["sport", "interest"],
  sports: ["sport", "interest"],
  vehicle: ["vehicle", "interest"],
  motorcycle: ["vehicle", "interest"],
  car: ["vehicle", "interest"],
  bike: ["vehicle", "sport", "interest"],
  technology: ["technology", "interest"],
  tech: ["technology", "interest"],
  book: ["book", "interest"],
  books: ["book", "interest"],
  movie: ["movie", "interest"],
  film: ["movie", "interest"],
  music: ["music", "interest"],
  travel: ["travel", "interest"],
  pet: ["pet"],
  pets: ["pet"],
  collection: ["collection", "interest"],
  profession: ["profession", "important_fact"],
  work: ["profession", "important_fact"],
  family: ["family", "important_fact"],
  lifestyle: ["lifestyle"],
  important: ["important_fact"],
  important_fact: ["important_fact"],
  gift_failure: ["gift_failure", "dislike"],
  disliked_gift: ["gift_failure", "dislike"],
  wishlist: ["wishlist"],
  wish: ["wishlist"],
};

const TITLE_TAGS: Readonly<Record<string, readonly SemanticMemoryTag[]>> = {
  favorite_brand: ["brand"],
  disliked_gift: ["gift_failure", "dislike"],
  preferred_style: ["lifestyle"],
  gift_failure: ["gift_failure", "dislike"],
  wishlist: ["wishlist"],
};

const LEGACY_TYPE_TAGS: Readonly<Record<string, readonly SemanticMemoryTag[]>> = {
  interest: ["interest"],
  preference: ["interest"],
  hobby: ["hobby", "interest"],
  place: ["lifestyle"],
  restaurant: ["favorite_food"],
  food: ["favorite_food"],
  coffee: ["favorite_food"],
  drink: ["favorite_food"],
  book: ["book", "interest"],
  movie: ["movie", "interest"],
  music: ["music", "interest"],
  pet: ["pet"],
  perfume: ["lifestyle"],
  flower: ["lifestyle"],
  travel: ["travel", "interest"],
  sport: ["sport", "interest"],
  gift: ["wishlist"],
  memory: ["memory"],
  story: ["memory"],
};

const KNOWN_SOURCE_TAGS = new Set<SemanticMemoryTag>([
  "interest",
  "hobby",
  "like",
  "dislike",
  "brand",
  "favorite_color",
  "favorite_food",
  "clothing_size",
  "sport",
  "vehicle",
  "technology",
  "book",
  "movie",
  "music",
  "travel",
  "pet",
  "collection",
  "profession",
  "family",
  "lifestyle",
  "previous_gift",
  "gift_failure",
  "wishlist",
  "important_fact",
  "memory",
]);

function key(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, "_").trim().toLocaleLowerCase();
  return normalized || null;
}

function add(target: Set<SemanticMemoryTag>, tags: readonly SemanticMemoryTag[] | undefined): void {
  for (const tag of tags ?? []) target.add(tag);
}

function polarityTags(polarity: KnowledgePolarity | null): SemanticMemoryTag[] {
  if (polarity === "likes" || polarity === "prefers") return ["like"];
  if (polarity === "dislikes" || polarity === "avoids") return ["dislike"];
  return [];
}

export function semanticTagsForKnowledge(item: KnowledgeItem): SemanticMemoryTag[] {
  const tags = new Set<SemanticMemoryTag>();
  const category = key(item.category);
  const title = key(item.title);
  const legacyType = key(item.legacyType);

  if (item.kind === "fact") tags.add("important_fact");
  if (item.kind === "wish") tags.add("wishlist");
  if (item.kind === "experience") tags.add("memory");
  if (item.kind === "preference") tags.add("interest");

  add(tags, category ? CATEGORY_TAGS[category] : undefined);
  add(tags, title ? TITLE_TAGS[title] : undefined);
  add(tags, legacyType ? LEGACY_TYPE_TAGS[legacyType] : undefined);
  add(tags, polarityTags(item.polarity));

  for (const rawTag of item.tags) {
    const normalized = key(rawTag);
    if (normalized && KNOWN_SOURCE_TAGS.has(normalized as SemanticMemoryTag)) {
      tags.add(normalized as SemanticMemoryTag);
    }
  }

  return [...tags].sort();
}

export function isConfirmedGivenGift(item: KnowledgeItem): boolean {
  return (
    item.kind === "gift" &&
    item.category === "given" &&
    item.classification?.userConfirmed === true
  );
}
