import type {
  BrainEvent,
  BrainPerson,
  Insight,
} from "../types";
import {
  consumerIsActive,
  consumerStoredType,
  consumerValue,
  type KnowledgeItem,
} from "../../knowledge/index.ts";

const GIFT_WINDOW_DAYS = 30;
const MISSING_CONTEXT_WINDOW_DAYS = 14;
const RECENT_MEMORY_WINDOW_DAYS = 30;

const CONTEXT_TYPES = new Set([
  "coffee",
  "restaurant",
  "food",
  "movie",
  "book",
  "music",
  "hobby",
  "perfume",
  "flower",
  "travel",
  "sport",
  "pet",
  "preference",
]);

const MEMORY_TYPES = new Set(["memory", "story"]);

/**
 * Event Insight uses 800 for an event inside seven days. Keeping this engine
 * just below it preserves the event engine as the source of truth for dates.
 */
export const MEMORY_INSIGHT_PRIORITY = {
  HIGH: 799,
  MEDIUM: 200,
  LOW: 50,
} as const;

export interface MemoryInsightInput {
  person: BrainPerson;
  event?: BrainEvent | null;
  memories: KnowledgeItem[];
  currentDate: Date;
}

function normalizedType(memory: KnowledgeItem): string {
  return consumerStoredType(memory)?.trim().toLowerCase() ?? "";
}

function meaningfulValue(value: string | null): value is string {
  return Boolean(value?.trim());
}

function timestamp(value: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function memoryTimestamp(memory: KnowledgeItem): number {
  const occurredAt = timestamp(memory.occurredOn);
  return Number.isFinite(occurredAt)
    ? occurredAt
    : timestamp(memory.createdAt);
}

function newestFirst(first: KnowledgeItem, second: KnowledgeItem): number {
  const dateDifference = memoryTimestamp(second) - memoryTimestamp(first);
  return dateDifference || first.id.localeCompare(second.id);
}

function createdNewestFirst(first: KnowledgeItem, second: KnowledgeItem): number {
  const dateDifference = timestamp(second.createdAt) - timestamp(first.createdAt);
  return dateDifference || first.id.localeCompare(second.id);
}

/** Active, person-owned gift ideas with a meaningful saved value. */
export function getGiftIdeasForPerson(
  memories: KnowledgeItem[],
  personId: string,
): KnowledgeItem[] {
  return memories
    .filter(
      (memory) =>
        consumerIsActive(memory) &&
        memory.personId === personId &&
        normalizedType(memory) === "gift" &&
        meaningfulValue(consumerValue(memory)),
    )
    .sort(createdNewestFirst);
}

/** Active, person-owned memories, including the compatible legacy story type. */
export function getMemoriesForPerson(
  memories: KnowledgeItem[],
  personId: string,
): KnowledgeItem[] {
  return memories
    .filter(
      (memory) =>
        consumerIsActive(memory) &&
        memory.personId === personId &&
        MEMORY_TYPES.has(normalizedType(memory)),
    )
    .sort(newestFirst);
}

/**
 * Active, person-owned structured context. Notes, journals and unknown legacy
 * raw types are deliberately excluded.
 */
export function getPersonContextRecords(
  memories: KnowledgeItem[],
  personId: string,
): KnowledgeItem[] {
  return memories
    .filter(
      (memory) =>
        consumerIsActive(memory) &&
        memory.personId === personId &&
        CONTEXT_TYPES.has(normalizedType(memory)) &&
        meaningfulValue(consumerValue(memory)),
    )
    .sort(createdNewestFirst);
}

function startOfLocalDay(value: Date): number {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  ).getTime();
}

function parseDate(value: string): Date | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const parsed = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      )
    : new Date(value);

  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function daysFromCurrentDate(date: string, currentDate: Date): number | null {
  const target = parseDate(date);
  if (!target) return null;

  return Math.round(
    (startOfLocalDay(target) - startOfLocalDay(currentDate)) /
      (24 * 60 * 60 * 1000),
  );
}

function isGiftRelevantEvent(event: BrainEvent): boolean {
  const category = event.category?.trim().toLowerCase();
  return (
    event.is_important ||
    category === "birthday" ||
    category === "urodziny" ||
    event.id.startsWith("birthday-")
  );
}

function compact(value: string, maximumLength = 120): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maximumLength) return normalized;
  return `${normalized.slice(0, maximumLength - 1).trimEnd()}…`;
}

function personRoute(personId: string): string {
  return `/people/${encodeURIComponent(personId)}`;
}

export function getMemoryInsightEventDaysUntil(
  event: BrainEvent | null | undefined,
  currentDate: Date,
): number | null {
  if (!event || !isGiftRelevantEvent(event)) return null;
  const daysUntil = daysFromCurrentDate(event.date, currentDate);
  return daysUntil !== null && daysUntil >= 0 ? daysUntil : null;
}

function eventPriority(daysUntil: number): number {
  return daysUntil <= 7
    ? MEMORY_INSIGHT_PRIORITY.HIGH
    : MEMORY_INSIGHT_PRIORITY.MEDIUM;
}

function recentMemory(
  memories: KnowledgeItem[],
  personId: string,
  currentDate: Date,
): KnowledgeItem | null {
  return (
    getMemoriesForPerson(memories, personId).find((memory) => {
      const relevantDate = memory.occurredOn ?? memory.createdAt;
      if (!relevantDate) return false;
      const ageInDays = daysFromCurrentDate(relevantDate, currentDate);
      return (
        ageInDays !== null &&
        ageInDays <= 0 &&
        ageInDays >= -RECENT_MEMORY_WINDOW_DAYS
      );
    }) ?? null
  );
}

/**
 * Produce at most one deterministic recommendation for a person. The engine
 * is pure: all dates and records arrive through the input.
 */
export function buildMemoryInsightForPerson({
  person,
  event,
  memories,
  currentDate,
}: MemoryInsightInput): Insight | null {
  const gifts = getGiftIdeasForPerson(memories, person.id);
  const contextRecords = getPersonContextRecords(memories, person.id);
  const daysUntilEvent = getMemoryInsightEventDaysUntil(event, currentDate);
  const personName = compact(person.name, 60) || "tej osoby";
  const action = {
    label: "Zobacz profil",
    action: personRoute(person.id),
  };

  if (daysUntilEvent !== null && daysUntilEvent <= GIFT_WINDOW_DAYS) {
    const [gift] = gifts;
    if (gift) {
      return {
        id: `memory-insight:gift-saved:${person.id}:${event!.id}:${gift.id}`,
        type: "gift_saved",
        priority: eventPriority(daysUntilEvent),
        icon: "🎁",
        title: `Masz już pomysł dla ${personName}`,
        description: compact(consumerValue(gift)!.trim()),
        reason: "upcoming_event_and_saved_gift",
        personId: person.id,
        eventId: event!.id,
        action,
        metadata: { sourceMemoryIds: [gift.id] },
      };
    }

    if (contextRecords.length > 0) {
      const safeValues = Array.from(
        new Set(contextRecords.map((record) => compact(consumerValue(record)!.trim(), 48))),
      ).slice(0, 2);
      const contextSuffix = safeValues.length > 0 ? ` ${safeValues.join(" · ")}` : "";

      return {
        id: `memory-insight:gift-context:${person.id}:${event!.id}:${contextRecords
          .slice(0, 2)
          .map((record) => record.id)
          .join("-")}`,
        type: "gift_suggestion_ready",
        priority: eventPriority(daysUntilEvent),
        icon: "💡",
        title: `Happy ma punkt wyjścia dla ${personName}`,
        description: `Masz zapisane informacje, które mogą pomóc wybrać prezent.${contextSuffix}`,
        reason: "upcoming_event_and_person_context",
        personId: person.id,
        eventId: event!.id,
        action,
        metadata: {
          sourceMemoryIds: contextRecords.slice(0, 2).map((record) => record.id),
        },
      };
    }

    if (daysUntilEvent <= MISSING_CONTEXT_WINDOW_DAYS) {
      return {
        id: `memory-insight:missing-context:${person.id}:${event!.id}`,
        type: "missing_person_context",
        priority: eventPriority(daysUntilEvent),
        icon: "📝",
        title: `Dodaj jedną rzecz o ${personName}`,
        description:
          "Wydarzenie jest blisko. Jedna informacja o zainteresowaniach pomoże Happy trafniej podpowiadać.",
        reason: "upcoming_event_missing_context",
        personId: person.id,
        eventId: event!.id,
        action,
        metadata: { sourceMemoryIds: [] },
      };
    }
  }

  const memory = recentMemory(memories, person.id, currentDate);
  if (!memory) return null;

  return {
    id: `memory-insight:recent-memory:${person.id}:${memory.id}`,
    type: "recent_memory",
    priority: MEMORY_INSIGHT_PRIORITY.LOW,
    icon: "💭",
    title: `Ostatnio zapisałaś wspomnienie z ${personName}`,
    description: memory.title?.trim()
      ? compact(memory.title)
      : "Zapisane wspomnienie.",
    reason: "recent_linked_memory",
    personId: person.id,
    action,
    metadata: { sourceMemoryIds: [memory.id] },
  };
}
