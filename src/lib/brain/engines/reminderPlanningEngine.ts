import {
  buildAllPeopleKnowledge,
  extractPersonKnowledgeValue,
} from "./personKnowledgeEngine.ts";
import type {
  BrainEvent,
  BrainMemory,
  BrainPerson,
  PersonKnowledge,
} from "../types.ts";

export const REMINDER_STAGE_DAYS = [30, 14, 7, 3, 1, 0] as const;
export type ReminderStage = (typeof REMINDER_STAGE_DAYS)[number];
export type ReminderPriority = "urgent" | "high" | "medium" | "low";
export type PlannedReminderType =
  | "event_upcoming"
  | "gift_prepare"
  | "gift_saved"
  | "missing_person_context"
  | "event_today";

export interface ReminderMessageDescriptor {
  titleKey: string;
  descriptionKey: string;
  actionLabelKey: string;
  params: Record<string, string | number>;
}

export interface PlannedReminder extends ReminderMessageDescriptor {
  id: string;
  type: PlannedReminderType;
  personId?: string;
  eventId: string;
  priority: ReminderPriority;
  eventDate: string;
  activateOn: string;
  expiresOn: string;
  action: { url: string };
  reason:
    | "event_today"
    | "event_soon"
    | "event_and_saved_gift"
    | "event_and_person_context"
    | "event_missing_context";
  sourceMemoryIds: string[];
  fallbackTitle?: string;
  fallbackDescription?: string;
}

export interface ReminderPlanningInput {
  people: BrainPerson[];
  events: BrainEvent[];
  memories: BrainMemory[];
  personKnowledge?: PersonKnowledge[];
  currentDate: Date;
}

export interface ActiveReminderStageInput {
  eventDate: string | Date;
  currentDate: Date;
}

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export interface BuildReminderForEventInput {
  event: BrainEvent;
  currentDate: Date;
  person?: BrainPerson | null;
  knowledge?: PersonKnowledge | null;
  memories?: BrainMemory[];
}

const DAY_MS = 86_400_000;
const CONTEXT_KEYS = [
  "interests", "favoriteDrinks", "hobbies", "favoriteFood",
  "favoritePlaces", "books", "movies", "music", "pets", "perfumes",
  "flowers", "travel", "sports",
] as const satisfies readonly (keyof PersonKnowledge)[];

function calendarDate(value: string | Date): CalendarDate | null {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return null;
    return { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() };
  }
  const exact = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value.trim());
  if (!exact) return null;
  const result = { year: Number(exact[1]), month: Number(exact[2]), day: Number(exact[3]) };
  const check = new Date(result.year, result.month - 1, result.day);
  return check.getFullYear() === result.year && check.getMonth() === result.month - 1 && check.getDate() === result.day
    ? result
    : null;
}

function serialDay(value: CalendarDate): number {
  return Date.UTC(value.year, value.month - 1, value.day) / DAY_MS;
}

function isoCalendarDate(value: CalendarDate): string {
  return `${String(value.year).padStart(4, "0")}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

function addCalendarDays(value: CalendarDate, days: number): CalendarDate {
  const date = new Date(Date.UTC(value.year, value.month - 1, value.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function eventDaysUntil(eventDate: string, currentDate: Date): number | null {
  const event = calendarDate(eventDate);
  const current = calendarDate(currentDate);
  return event && current ? serialDay(event) - serialDay(current) : null;
}

export function getActiveReminderStage({
  eventDate,
  currentDate,
}: ActiveReminderStageInput): ReminderStage | null {
  const parsedEvent = calendarDate(eventDate);
  if (!parsedEvent) return null;
  const event = isoCalendarDate(parsedEvent);
  const days = eventDaysUntil(event, currentDate);
  if (days === null || days < 0 || days > 30) return null;
  if (days === 0) return 0;
  if (days === 1) return 1;
  if (days <= 3) return 3;
  if (days <= 7) return 7;
  if (days <= 14) return 14;
  return 30;
}

function isBirthday(event: BrainEvent): boolean {
  const category = event.category?.trim().toLowerCase();
  return category === "birthday" || category === "urodziny" || event.id.startsWith("birthday-");
}

function isEligibleEvent(event: BrainEvent, person: BrainPerson | null): boolean {
  if (!event.id.trim() || !calendarDate(event.date)) return false;
  if (isBirthday(event)) return Boolean(person);
  return event.is_important;
}

function priorityFor(daysUntil: number): ReminderPriority {
  if (daysUntil <= 1) return "urgent";
  if (daysUntil <= 7) return "high";
  if (daysUntil <= 14) return "medium";
  return "low";
}

function stageWindow(eventDate: CalendarDate, stage: ReminderStage) {
  const endOffsets: Record<ReminderStage, number> = { 30: -14, 14: -7, 7: -3, 3: -1, 1: 0, 0: 1 };
  return {
    activateOn: isoCalendarDate(addCalendarDays(eventDate, -stage)),
    expiresOn: isoCalendarDate(addCalendarDays(eventDate, endOffsets[stage])),
  };
}

function meaningful(value: string | undefined | null): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function contextValues(knowledge: PersonKnowledge | null | undefined): string[] {
  if (!knowledge) return [];
  const values: string[] = [];
  const seen = new Set<string>();
  for (const key of CONTEXT_KEYS) {
    const list = knowledge[key] as string[];
    for (const raw of list) {
      const value = meaningful(raw);
      const normalized = value?.toLocaleLowerCase();
      if (value && normalized && !seen.has(normalized)) {
        seen.add(normalized);
        values.push(value);
        if (values.length === 2) return values;
      }
    }
  }
  return values;
}

function contextSourceIds(memories: BrainMemory[], personId: string, values: string[]): string[] {
  const wanted = new Set(values.map((value) => value.toLocaleLowerCase()));
  const result: string[] = [];
  for (const memory of memories) {
    if (!memory.isActive || memory.personId !== personId) continue;
    const value = extractPersonKnowledgeValue(memory);
    if (value && wanted.has(value.toLocaleLowerCase()) && !result.includes(memory.id)) result.push(memory.id);
  }
  return result.sort();
}

function descriptor(type: PlannedReminderType): Omit<ReminderMessageDescriptor, "params"> {
  const names = {
    event_today: "today",
    gift_saved: "savedGift",
    gift_prepare: "prepareGift",
    missing_person_context: "missingContext",
    event_upcoming: "upcoming",
  } as const;
  const action = type === "missing_person_context" ? "addInformation" : type === "gift_prepare" ? "prepare" : "viewPerson";
  return {
    titleKey: `reminders.${names[type]}.title`,
    descriptionKey: `reminders.${names[type]}.description`,
    actionLabelKey: `reminders.actions.${action}`,
  };
}

export function buildReminderForEvent({
  event,
  currentDate,
  person = null,
  knowledge = null,
  memories = [],
}: BuildReminderForEventInput): PlannedReminder | null {
  if (!isEligibleEvent(event, person)) return null;
  const eventDate = calendarDate(event.date);
  const daysUntil = eventDaysUntil(event.date, currentDate);
  const stage = getActiveReminderStage({ eventDate: event.date, currentDate });
  if (!eventDate || daysUntil === null || stage === null) return null;

  const personName = meaningful(person?.name) ?? meaningful(event.person_name);
  const gifts = knowledge?.giftIdeas ?? [];
  const context = contextValues(knowledge);
  let type: PlannedReminderType;
  if (daysUntil === 0) type = "event_today";
  else if (gifts.length > 0) type = "gift_saved";
  else if (context.length > 0) type = "gift_prepare";
  else if (daysUntil <= 14 && person) type = "missing_person_context";
  else type = "event_upcoming";

  const params: Record<string, string | number> = { daysUntil };
  if (personName) params.personName = personName;
  if (type === "gift_prepare") {
    if (context[0]) params.context1 = context[0];
    if (context[1]) params.context2 = context[1];
  }
  const sourceMemoryIds = type === "gift_saved"
    ? gifts.map((gift) => gift.memoryId).filter(Boolean).sort()
    : type === "gift_prepare" && person
      ? contextSourceIds(memories, person.id, context)
      : [];
  const reason = type === "event_today" ? "event_today"
    : type === "gift_saved" ? "event_and_saved_gift"
      : type === "gift_prepare" ? "event_and_person_context"
        : type === "missing_person_context" ? "event_missing_context" : "event_soon";
  const message = descriptor(type);
  const window = stageWindow(eventDate, stage);
  const personId = meaningful(person?.id);

  return {
    id: `planned-reminder:${event.id}:${personId ?? "dashboard"}:${stage}`,
    type,
    ...(personId ? { personId } : {}),
    eventId: event.id,
    priority: priorityFor(daysUntil),
    ...message,
    params,
    eventDate: isoCalendarDate(eventDate),
    ...window,
    action: { url: personId ? `/people/${encodeURIComponent(personId)}` : "/dashboard" },
    reason,
    sourceMemoryIds,
  };
}

const PRIORITY_RANK: Record<ReminderPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function compareReminders(a: PlannedReminder, b: PlannedReminder): number {
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    || a.eventDate.localeCompare(b.eventDate)
    || a.eventId.localeCompare(b.eventId)
    || a.id.localeCompare(b.id);
}

export function selectTopReminder(reminders: PlannedReminder[]): PlannedReminder | null {
  return reminders.length ? reminders.slice().sort(compareReminders)[0] : null;
}

export function planReminders(input: ReminderPlanningInput): PlannedReminder[] {
  const knowledge = input.personKnowledge ?? buildAllPeopleKnowledge({
    people: input.people,
    memories: input.memories,
    currentDate: input.currentDate,
  });
  const peopleById = new Map(input.people.map((person) => [person.id, person]));
  const peopleByName = new Map<string, BrainPerson | null>();
  for (const person of input.people) {
    const key = person.name.trim().toLocaleLowerCase();
    peopleByName.set(key, peopleByName.has(key) ? null : person);
  }
  const knowledgeByPerson = new Map(knowledge.map((item) => [item.personId, item]));
  const memoriesByPerson = new Map<string, BrainMemory[]>();
  for (const memory of input.memories) {
    if (!memory.personId) continue;
    const group = memoriesByPerson.get(memory.personId) ?? [];
    group.push(memory);
    memoriesByPerson.set(memory.personId, group);
  }

  const byEvent = new Map<string, PlannedReminder>();
  for (const event of input.events) {
    const person = event.personId
      ? peopleById.get(event.personId) ?? null
      : meaningful(event.person_name)
        ? peopleByName.get(event.person_name!.trim().toLocaleLowerCase()) ?? null
        : null;
    const reminder = buildReminderForEvent({
      event,
      person,
      knowledge: person ? knowledgeByPerson.get(person.id) ?? null : null,
      memories: person ? memoriesByPerson.get(person.id) ?? [] : [],
      currentDate: input.currentDate,
    });
    const existing = byEvent.get(event.id);
    if (reminder && (!existing || compareReminders(reminder, existing) < 0)) byEvent.set(event.id, reminder);
  }
  return [...byEvent.values()].sort(compareReminders);
}
