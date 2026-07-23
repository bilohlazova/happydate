import type { PersonSemanticMemoryProjection, SemanticFact } from "../semantic-memory/index.ts";
import type { GiftRecommendationContext } from "./giftIntelligence.types.ts";

export type GiftSemanticMemoryContextProjection =
  GiftRecommendationContext["preferences"] &
  Pick<GiftRecommendationContext, "knowledge" | "memories">;

function normalizedKey(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function pushUnique(target: string[], seen: Set<string>, value: string): void {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return;
  const key = normalizedKey(normalized);
  if (seen.has(key)) return;
  seen.add(key);
  target.push(normalized);
}

function byGiftContextOrder(first: SemanticFact, second: SemanticFact): number {
  return (
    (second.lastSeenAt ?? "").localeCompare(first.lastSeenAt ?? "") ||
    (first.sourceKnowledgeIds[0] ?? first.id).localeCompare(second.sourceKnowledgeIds[0] ?? second.id) ||
    first.normalizedValue.localeCompare(second.normalizedValue) ||
    first.id.localeCompare(second.id)
  );
}

function shouldMapToGiftInterest(fact: SemanticFact): boolean {
  if (!fact.tags.includes("interest")) return false;
  return !fact.tags.some((tag) =>
    tag === "favorite_food" ||
    tag === "favorite_color" ||
    tag === "clothing_size" ||
    tag === "gift_failure" ||
    tag === "preferred_style" ||
    tag === "memory" ||
    tag === "previous_gift"
  );
}

function emptyGiftProjection(): GiftSemanticMemoryContextProjection {
  return {
    likes: [],
    dislikes: [],
    interests: [],
    wishes: [],
    importantFacts: [],
    knowledge: {
      interests: [],
      hobbies: [],
      favoriteBrands: [],
      dislikedGifts: [],
      preferredStyles: [],
    },
    memories: [],
  };
}

export function mapSemanticMemoryToGiftContextProjection(
  projection: PersonSemanticMemoryProjection | null,
): GiftSemanticMemoryContextProjection {
  const result = emptyGiftProjection();
  const seen = {
    likes: new Set<string>(),
    dislikes: new Set<string>(),
    interests: new Set<string>(),
    wishes: new Set<string>(),
    importantFacts: new Set<string>(),
    knowledgeInterests: new Set<string>(),
    knowledgeHobbies: new Set<string>(),
    favoriteBrands: new Set<string>(),
    dislikedGifts: new Set<string>(),
    preferredStyles: new Set<string>(),
    memories: new Set<string>(),
  };

  const facts = [...(projection?.facts ?? [])].sort(byGiftContextOrder);

  for (const fact of facts) {
    if (fact.tags.includes("brand")) {
      pushUnique(result.knowledge.favoriteBrands, seen.favoriteBrands, fact.value);
      pushUnique(result.likes, seen.likes, fact.value);
    }
    if (fact.tags.includes("gift_failure")) {
      pushUnique(result.knowledge.dislikedGifts, seen.dislikedGifts, fact.value);
      pushUnique(result.dislikes, seen.dislikes, fact.value);
    }
    if (fact.tags.includes("preferred_style")) {
      pushUnique(result.knowledge.preferredStyles, seen.preferredStyles, fact.value);
      pushUnique(result.wishes, seen.wishes, fact.value);
    }
    if (fact.tags.includes("hobby")) {
      pushUnique(result.knowledge.hobbies, seen.knowledgeHobbies, fact.value);
      pushUnique(result.interests, seen.interests, fact.value);
    } else if (shouldMapToGiftInterest(fact)) {
      pushUnique(result.knowledge.interests, seen.knowledgeInterests, fact.value);
      pushUnique(result.interests, seen.interests, fact.value);
    }
    if (fact.tags.includes("like") && !shouldMapToGiftInterest(fact)) {
      pushUnique(result.likes, seen.likes, fact.value);
    }
    if (fact.tags.includes("dislike")) {
      pushUnique(result.dislikes, seen.dislikes, fact.value);
    }
    if (fact.tags.includes("wishlist")) {
      pushUnique(result.wishes, seen.wishes, fact.value);
    }
    if (fact.tags.includes("important_fact")) {
      pushUnique(result.importantFacts, seen.importantFacts, fact.value);
    }
  }

  for (const item of [...(projection?.timeline ?? [])].sort(
    (first, second) => second.date.localeCompare(first.date) || first.id.localeCompare(second.id),
  )) {
    if (item.kind !== "memory") continue;
    const key = normalizedKey(item.title);
    if (seen.memories.has(key)) continue;
    seen.memories.add(key);
    result.memories.push({
      id: item.sourceKnowledgeIds[0] ?? item.id,
      value: item.title,
      occurredOn: item.date,
    });
  }

  for (const fact of facts) {
    if (!fact.tags.includes("memory")) continue;
    const key = normalizedKey(fact.value);
    if (seen.memories.has(key)) continue;
    seen.memories.add(key);
    result.memories.push({
      id: fact.sourceKnowledgeIds[0] ?? fact.id,
      value: fact.value,
      occurredOn: null,
    });
  }

  return result;
}
