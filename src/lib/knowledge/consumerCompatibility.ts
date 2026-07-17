import type { KnowledgeItem } from "./domain.ts";

type LegacyFixture = Partial<{
  type: string | null;
  value: string | null;
  content: string | null;
  isActive: boolean;
}>;

function legacyFixture(item: KnowledgeItem): LegacyFixture {
  return item as KnowledgeItem & LegacyFixture;
}

/** Audited accessors preserving pre-Knowledge Brain behavior during migration. */
export function consumerStoredType(item: KnowledgeItem): string | null {
  return item.legacyType ?? legacyFixture(item).type ?? null;
}

export function consumerValue(item: KnowledgeItem): string | null {
  return item.compatibility?.valueText ?? legacyFixture(item).value ?? null;
}

export function consumerContent(item: KnowledgeItem): string | null {
  return item.compatibility?.contentText ?? legacyFixture(item).content ?? null;
}

export function consumerIsActive(item: KnowledgeItem): boolean {
  return item.state ? item.state === "active" : legacyFixture(item).isActive === true;
}

