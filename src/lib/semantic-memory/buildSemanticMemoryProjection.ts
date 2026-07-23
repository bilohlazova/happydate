import type { KnowledgeItem, KnowledgeSourceKind } from "../knowledge/domain.ts";
import {
  SEMANTIC_MEMORY_TAXONOMY_VERSION,
  SEMANTIC_MEMORY_VERSION,
  type PersonSemanticMemoryProjection,
  type SemanticFact,
  type SemanticMemoryPersonInput,
  type SemanticMemoryProjection,
  type SemanticMemoryTag,
  type SemanticTimelineItem,
} from "./semanticMemory.types.ts";
import { isConfirmedGivenGift, semanticTagsForKnowledge } from "./semanticMemoryTaxonomy.ts";

const ACTIVE_STATES = new Set(["active", "confirmed"]);

function clean(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || null;
}

export function normalizeSemanticMemoryValue(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function factValue(item: KnowledgeItem): string | null {
  return clean(item.value) ?? clean(item.title) ?? clean(item.summary);
}

function timelineValue(item: KnowledgeItem): string | null {
  return clean(item.value) ?? clean(item.title) ?? clean(item.summary) ?? clean(item.evidence.originalText);
}

function activeKnowledge(item: KnowledgeItem): boolean {
  return ACTIVE_STATES.has(item.state);
}

function semanticEligible(item: KnowledgeItem): boolean {
  return activeKnowledge(item) && item.kind !== "journal" && item.aiEligible !== false;
}

function sortedDate(item: Pick<KnowledgeItem, "occurredOn" | "createdAt" | "updatedAt">): string {
  return item.occurredOn ?? item.updatedAt ?? item.createdAt ?? "";
}

function minDate(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return left <= right ? left : right;
}

function maxDate(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return left >= right ? left : right;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

function sourceScore(source: KnowledgeSourceKind): number {
  if (source === "manual" || source === "chat") return 0.82;
  if (source === "ai") return 0.72;
  if (source === "import") return 0.64;
  if (source === "legacy") return 0.56;
  return 0.5;
}

function scoreKnowledge(item: KnowledgeItem): number {
  let score = sourceScore(item.evidence.sourceKind);
  if (item.classification?.userConfirmed) score += 0.12;
  if (item.state === "confirmed") score += 0.08;
  if (item.importance > 0) score += Math.min(0.06, item.importance * 0.015);
  if (!item.classification && item.evidence.sourceKind === "legacy") score -= 0.04;
  return clampScore(score);
}

function mergeTags(left: readonly SemanticMemoryTag[], right: readonly SemanticMemoryTag[]): SemanticMemoryTag[] {
  return [...new Set([...left, ...right])].sort();
}

function factId(personId: string | null, normalizedValue: string): string {
  return ["semantic-fact", personId ?? "unassigned", normalizedValue.replace(/\s+/g, "-")].join(":");
}

function conflictingPolarity(
  first: SemanticFact["polarity"],
  second: SemanticFact["polarity"],
): boolean {
  const positive = new Set(["likes", "prefers"]);
  const negative = new Set(["dislikes", "avoids"]);
  return (
    (!!first && !!second) &&
    ((positive.has(first) && negative.has(second)) || (negative.has(first) && positive.has(second)))
  );
}

function buildFact(item: KnowledgeItem, tags: SemanticMemoryTag[]): SemanticFact | null {
  const value = factValue(item);
  if (!value) return null;
  const normalizedValue = normalizeSemanticMemoryValue(value);
  if (!normalizedValue || !tags.length) return null;
  const seenAt = sortedDate(item) || null;
  return {
    id: factId(item.personId, normalizedValue),
    personId: item.personId,
    value,
    normalizedValue,
    tags,
    score: scoreKnowledge(item),
    polarity: item.polarity,
    source: item.evidence.sourceKind,
    sourceKnowledgeIds: [item.id],
    firstSeenAt: seenAt,
    lastSeenAt: seenAt,
    userConfirmed: item.classification?.userConfirmed === true,
    state: "active",
  };
}

function mergeFact(existing: SemanticFact, next: SemanticFact): SemanticFact {
  const sourceKnowledgeIds = [...new Set([...existing.sourceKnowledgeIds, ...next.sourceKnowledgeIds])].sort();
  const score = clampScore(Math.max(existing.score, next.score) + Math.min(0.08, (sourceKnowledgeIds.length - 1) * 0.02));
  return {
    ...existing,
    value: next.lastSeenAt && (!existing.lastSeenAt || next.lastSeenAt >= existing.lastSeenAt)
      ? next.value
      : existing.value,
    tags: mergeTags(existing.tags, next.tags),
    score,
    polarity: existing.polarity === next.polarity ? existing.polarity : existing.polarity ?? next.polarity,
    source: existing.score >= next.score ? existing.source : next.source,
    sourceKnowledgeIds,
    firstSeenAt: minDate(existing.firstSeenAt, next.firstSeenAt),
    lastSeenAt: maxDate(existing.lastSeenAt, next.lastSeenAt),
    userConfirmed: existing.userConfirmed || next.userConfirmed,
    state: conflictingPolarity(existing.polarity, next.polarity) ? "conflicting" : existing.state,
  };
}

function sortFacts(first: SemanticFact, second: SemanticFact): number {
  return (
    second.score - first.score ||
    (second.lastSeenAt ?? "").localeCompare(first.lastSeenAt ?? "") ||
    first.normalizedValue.localeCompare(second.normalizedValue) ||
    first.id.localeCompare(second.id)
  );
}

function sortTimeline(first: SemanticTimelineItem, second: SemanticTimelineItem): number {
  return second.date.localeCompare(first.date) || first.id.localeCompare(second.id);
}

function buildTimelineItem(item: KnowledgeItem): SemanticTimelineItem | null {
  if (item.kind !== "experience" && !isConfirmedGivenGift(item)) return null;
  const date = item.occurredOn ?? (isConfirmedGivenGift(item) ? item.createdAt : null);
  const title = timelineValue(item);
  if (!date || !title) return null;
  return {
    id: `semantic-timeline:${item.id}`,
    personId: item.personId,
    kind: isConfirmedGivenGift(item) ? "previous_gift" : "memory",
    title,
    date,
    sourceKnowledgeIds: [item.id],
  };
}

function personSummary(facts: readonly SemanticFact[]) {
  const knownFactCount = facts.length;
  const averageScore = knownFactCount
    ? clampScore(facts.reduce((sum, fact) => sum + fact.score, 0) / knownFactCount)
    : 0;
  const tagSet = new Set(facts.flatMap((fact) => fact.tags));
  const completenessAreas = [
    "interest",
    "hobby",
    "like",
    "dislike",
    "wishlist",
    "memory",
    "previous_gift",
    "important_fact",
  ];
  const completed = completenessAreas.filter((tag) => tagSet.has(tag as SemanticMemoryTag)).length;
  return {
    knownFactCount,
    averageScore,
    completenessScore: clampScore(completed / completenessAreas.length),
    updatedAt: facts.reduce<string | null>((latest, fact) => maxDate(latest, fact.lastSeenAt), null),
  };
}

export function buildSemanticMemoryProjection({
  people = [],
  knowledge,
  currentDate = new Date(),
}: {
  people?: readonly SemanticMemoryPersonInput[];
  knowledge: readonly KnowledgeItem[];
  currentDate?: Date;
}): SemanticMemoryProjection {
  const factMap = new Map<string, SemanticFact>();
  const timeline: SemanticTimelineItem[] = [];

  for (const item of knowledge.filter(semanticEligible)) {
    const tags = semanticTagsForKnowledge(item);
    if (isConfirmedGivenGift(item)) tags.push("previous_gift");
    const fact = buildFact(item, [...new Set(tags)].sort());
    if (fact) {
      const existing = factMap.get(fact.id);
      factMap.set(fact.id, existing ? mergeFact(existing, fact) : fact);
    }
    const timelineItem = buildTimelineItem(item);
    if (timelineItem) timeline.push(timelineItem);
  }

  const peopleIds = new Set(people.map((person) => person.id));
  for (const fact of factMap.values()) {
    if (fact.personId) peopleIds.add(fact.personId);
  }

  const personProjections: PersonSemanticMemoryProjection[] = [...peopleIds]
    .sort()
    .map((personId) => {
      const facts = [...factMap.values()]
        .filter((fact) => fact.personId === personId)
        .sort(sortFacts);
      return {
        personId,
        facts,
        timeline: timeline.filter((item) => item.personId === personId).sort(sortTimeline),
        summary: personSummary(facts),
      };
    });

  return {
    version: SEMANTIC_MEMORY_VERSION,
    taxonomyVersion: SEMANTIC_MEMORY_TAXONOMY_VERSION,
    generatedAt: currentDate.toISOString(),
    people: personProjections,
    unassigned: [...factMap.values()].filter((fact) => !fact.personId).sort(sortFacts),
    relationships: [],
  };
}
