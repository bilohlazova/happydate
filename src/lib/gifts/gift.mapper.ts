import type { KnowledgeItem } from "../knowledge/index.ts";
import type {
  GiftCollectionViewModel,
  GiftItemViewModel,
  GiftLifecycle,
  GiftRecord,
  GiftWorkspaceViewModel,
} from "./gift.types.ts";

const ACTIVE_LIFECYCLE = new Set<GiftLifecycle>([
  "idea",
  "selected",
  "purchased",
]);

function normalizedText(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || null;
}

export function mapKnowledgeToGiftLifecycle(
  item: KnowledgeItem
): GiftLifecycle | null {
  if (item.kind !== "gift" || item.state !== "active") return null;
  if (
    item.category === "idea" ||
    item.category === "selected" ||
    item.category === "purchased"
  ) {
    return item.category;
  }
  if (
    item.category === "given" &&
    item.classification?.userConfirmed === true
  ) {
    return "given";
  }
  return null;
}

export function mapKnowledgeToGift(item: KnowledgeItem): GiftRecord | null {
  const lifecycle = mapKnowledgeToGiftLifecycle(item);
  const value =
    normalizedText(item.value) ??
    normalizedText(item.title) ??
    normalizedText(item.summary);
  if (!lifecycle || !value) return null;
  return {
    id: item.id,
    lifecycle,
    personId: item.personId,
    eventId: item.eventId,
    title: normalizedText(item.title),
    value,
    occurredOn: item.occurredOn,
    createdAt: item.createdAt,
    sourceKnowledgeId: item.id,
  };
}

export function mapKnowledgeToGifts(
  items: readonly KnowledgeItem[]
): GiftRecord[] {
  return items
    .map(mapKnowledgeToGift)
    .filter((gift): gift is GiftRecord => gift !== null)
    .sort(compareGiftRecords);
}

export function isActiveGiftIdea(gift: GiftRecord): boolean {
  return ACTIVE_LIFECYCLE.has(gift.lifecycle);
}

export function isGiftHistory(gift: GiftRecord): boolean {
  return gift.lifecycle === "given";
}

export function buildGiftCollectionViewModel(
  gifts: readonly GiftRecord[]
): GiftCollectionViewModel {
  const counts = { idea: 0, selected: 0, purchased: 0, given: 0 };
  for (const gift of gifts) counts[gift.lifecycle] += 1;
  return {
    activeIdeas: gifts.filter(isActiveGiftIdea).map(toViewModel),
    history: gifts.filter(isGiftHistory).map(toViewModel),
    counts,
  };
}

export function buildGiftWorkspaceViewModel(
  gifts: readonly GiftRecord[],
  isAuthenticated: boolean
): GiftWorkspaceViewModel {
  const collection = buildGiftCollectionViewModel(gifts);
  const personIds = uniqueIds(gifts.map((gift) => gift.personId));
  const eventIds = uniqueIds(gifts.map((gift) => gift.eventId));
  return {
    isAuthenticated,
    ...collection,
    personIds,
    eventIds,
    recommendationContext: {
      activeIdeas: collection.activeIdeas,
      confirmedHistory: collection.history,
      personIds,
      eventIds,
    },
  };
}

function toViewModel(gift: GiftRecord): GiftItemViewModel {
  return {
    id: gift.id,
    lifecycle: gift.lifecycle,
    title: gift.value,
    personId: gift.personId,
    eventId: gift.eventId,
    date: gift.occurredOn ?? gift.createdAt,
    canChangeLifecycle: gift.sourceKnowledgeId === null,
  };
}

function compareGiftRecords(first: GiftRecord, second: GiftRecord): number {
  const firstDate = first.occurredOn ?? first.createdAt ?? "";
  const secondDate = second.occurredOn ?? second.createdAt ?? "";
  return secondDate.localeCompare(firstDate) || first.id.localeCompare(second.id);
}

function uniqueIds(ids: Array<string | null>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))].sort();
}
