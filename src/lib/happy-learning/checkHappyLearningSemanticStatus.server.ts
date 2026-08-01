import type { KnowledgeItem, KnowledgePolarity } from "../knowledge/index.ts";
import {
  normalizeSemanticMemoryValue,
  type SemanticFact,
  type SemanticMemoryTag,
} from "../semantic-memory/index.ts";
import type {
  HappyLearningSemanticCheckInput,
  HappyLearningSemanticCheckResult,
} from "./happyLearningSemanticCheck.types.ts";

const POSITIVE = new Set<KnowledgePolarity>(["likes", "prefers"]);
const NEGATIVE = new Set<KnowledgePolarity>(["dislikes", "avoids"]);
const SENTIMENT_TAGS = new Set<SemanticMemoryTag>(["like", "dislike"]);
const EXCLUSIVE_VALUE_TAGS = new Set<SemanticMemoryTag>(["favorite_color", "clothing_size"]);

function oppositePolarity(
  first: KnowledgePolarity | null,
  second: KnowledgePolarity | null,
): boolean {
  return Boolean(
    first && second
    && ((POSITIVE.has(first) && NEGATIVE.has(second)) || (NEGATIVE.has(first) && POSITIVE.has(second))),
  );
}

function meaningfulTagOverlap(
  candidateTags: readonly SemanticMemoryTag[],
  factTags: readonly SemanticMemoryTag[],
  candidatePolarity: KnowledgePolarity | null,
  factPolarity: KnowledgePolarity | null,
): boolean {
  const factSet = new Set(factTags);
  if (candidateTags.some((tag) => !SENTIMENT_TAGS.has(tag) && factSet.has(tag))) return true;
  if (candidateTags.some((tag) => SENTIMENT_TAGS.has(tag) && factSet.has(tag))) return true;
  return oppositePolarity(candidatePolarity, factPolarity)
    && candidateTags.some((tag) => SENTIMENT_TAGS.has(tag))
    && factTags.some((tag) => SENTIMENT_TAGS.has(tag));
}

function eligibleSource(item: KnowledgeItem, personId: string): boolean {
  return item.personId === personId
    && (item.state === "active" || item.state === "confirmed")
    && item.aiEligible !== false;
}

function sourceIdsForFact(
  fact: SemanticFact,
  sources: ReadonlyMap<string, KnowledgeItem>,
): string[] {
  return fact.sourceKnowledgeIds
    .filter((id) => {
      const source = sources.get(id);
      return source ? eligibleSource(source, fact.personId ?? "") : true;
    })
    .sort();
}

function sourcePolarity(
  id: string,
  sources: ReadonlyMap<string, KnowledgeItem>,
  fallback: KnowledgePolarity | null,
): KnowledgePolarity | null {
  return sources.get(id)?.polarity ?? fallback;
}

function result(
  value: HappyLearningSemanticCheckResult,
): HappyLearningSemanticCheckResult {
  return {
    ...value,
    matchedKnowledgeIds: [...new Set(value.matchedKnowledgeIds)].sort(),
    conflictingKnowledgeIds: [...new Set(value.conflictingKnowledgeIds)].sort(),
  };
}

export function checkHappyLearningSemanticStatus({
  personId,
  candidate,
  knowledge,
  semanticMemory,
}: HappyLearningSemanticCheckInput): HappyLearningSemanticCheckResult {
  const person = semanticMemory.people.find((item) => item.personId === personId);
  if (!person) return result({ status: "new", matchedKnowledgeIds: [], conflictingKnowledgeIds: [], reason: "no_match" });
  const sources = new Map(
    knowledge.filter((item) => eligibleSource(item, personId)).map((item) => [item.id, item]),
  );
  const normalizedCandidate = normalizeSemanticMemoryValue(candidate.value);

  for (const fact of person.facts) {
    if (fact.state !== "active" && fact.state !== "conflicting") continue;
    if (fact.normalizedValue !== normalizedCandidate) continue;
    if (!meaningfulTagOverlap(candidate.semanticTags, fact.tags, candidate.polarity, fact.polarity)) continue;
    const factSourceIds = sourceIdsForFact(fact, sources);
    const conflictingIds = factSourceIds.filter((id) =>
      oppositePolarity(candidate.polarity, sourcePolarity(id, sources, fact.polarity)),
    );
    if (conflictingIds.length || oppositePolarity(candidate.polarity, fact.polarity)) {
      return result({
        status: "conflict",
        matchedKnowledgeIds: factSourceIds,
        conflictingKnowledgeIds: conflictingIds.length ? conflictingIds : factSourceIds,
        reason: "opposite_polarity",
      });
    }
    const samePolarity = factSourceIds.some((id) =>
      candidate.polarity !== null && sourcePolarity(id, sources, fact.polarity) === candidate.polarity,
    );
    return result({
      status: "already_known",
      matchedKnowledgeIds: factSourceIds,
      conflictingKnowledgeIds: [],
      reason: samePolarity ? "same_value_same_polarity" : "same_semantic_fact",
    });
  }

  for (const fact of person.facts) {
    if (fact.state !== "active" && fact.state !== "conflicting") continue;
    const sharedExclusiveTag = candidate.semanticTags.find((tag) =>
      EXCLUSIVE_VALUE_TAGS.has(tag) && fact.tags.includes(tag),
    );
    if (!sharedExclusiveTag || fact.normalizedValue === normalizedCandidate) continue;
    const factSourceIds = sourceIdsForFact(fact, sources);
    return result({
      status: "conflict",
      matchedKnowledgeIds: factSourceIds,
      conflictingKnowledgeIds: factSourceIds,
      reason: "ambiguous_semantic_match",
    });
  }

  return result({ status: "new", matchedKnowledgeIds: [], conflictingKnowledgeIds: [], reason: "no_match" });
}
