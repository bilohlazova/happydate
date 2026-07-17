import type {
  KnowledgeItem,
  KnowledgeContextOptions,
  KnowledgeSnapshot,
  PersonKnowledgeProfile,
} from "./domain.ts";

function byNewest(left: KnowledgeItem, right: KnowledgeItem): number {
  const leftDate = left.occurredOn ?? left.createdAt ?? "";
  const rightDate = right.occurredOn ?? right.createdAt ?? "";

  return rightDate.localeCompare(leftDate) || left.id.localeCompare(right.id);
}

export function buildPersonKnowledgeProfile(
  personId: string,
  items: KnowledgeItem[]
): PersonKnowledgeProfile {
  const sorted = [...items].sort(byNewest);

  return {
    personId,
    items: sorted,
    facts: sorted.filter((item) => item.kind === "fact"),
    preferences: sorted.filter((item) => item.kind === "preference"),
    experiences: sorted.filter((item) => item.kind === "experience"),
    gifts: sorted.filter((item) => item.kind === "gift"),
    wishes: sorted.filter((item) => item.kind === "wish"),
  };
}

/**
 * Build a deterministic read-only Knowledge projection. It has no persistence
 * or UI dependencies, making it safe to place between Repository and Brain in
 * later, separately verified stages.
 */
export function buildKnowledgeSnapshot(
  input: readonly KnowledgeItem[]
): KnowledgeSnapshot {
  const items = [...input].sort(byNewest);
  const grouped = new Map<string, KnowledgeItem[]>();
  const unassigned: KnowledgeItem[] = [];

  for (const item of items) {
    if (!item.personId) {
      unassigned.push(item);
      continue;
    }

    const group = grouped.get(item.personId) ?? [];
    group.push(item);
    grouped.set(item.personId, group);
  }

  const byPersonId = new Map<string, PersonKnowledgeProfile>();
  for (const [personId, personItems] of grouped) {
    byPersonId.set(personId, buildPersonKnowledgeProfile(personId, personItems));
  }

  return { items, byPersonId, unassigned };
}

export function getPersonKnowledge(
  snapshot: KnowledgeSnapshot,
  personId: string
): PersonKnowledgeProfile | null {
  return snapshot.byPersonId.get(personId) ?? null;
}

export function getAiEligibleKnowledge(
  items: readonly KnowledgeItem[]
): KnowledgeItem[] {
  return items.filter(
    (item) => item.aiEligible && item.state === "active"
  );
}

/**
 * Select bounded, AI-safe knowledge. Relevance scoring remains out of scope
 * until consumers are migrated; current ordering stays deterministic.
 */
export function selectKnowledgeContext(
  items: readonly KnowledgeItem[],
  options: KnowledgeContextOptions = {}
): KnowledgeItem[] {
  const personIds = options.personIds
    ? new Set(options.personIds)
    : null;
  const limit = Math.max(0, Math.floor(options.limit ?? 50));

  return getAiEligibleKnowledge(items)
    .filter((item) => !personIds || (!!item.personId && personIds.has(item.personId)))
    .sort(byNewest)
    .slice(0, limit);
}
