import type { CalendarEventRecord, EventRecurrenceRule } from "@/lib/repositories/events/events.types";
import { formatLocalDateOnly, parseLocalDateOnly } from "./dateOnly.ts";

export interface CalendarEventOccurrence extends CalendarEventRecord {
  sourceEventId: string;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function occurrenceAt(anchor: Date, rule: EventRecurrenceRule, index: number): Date {
  if (rule === "weekly") {
    const date = new Date(anchor);
    date.setDate(anchor.getDate() + index * 7);
    return date;
  }

  if (rule === "monthly") {
    const absoluteMonth = anchor.getFullYear() * 12 + anchor.getMonth() + index;
    const year = Math.floor(absoluteMonth / 12);
    const month = absoluteMonth % 12;
    return new Date(year, month, Math.min(anchor.getDate(), daysInMonth(year, month)), 12);
  }

  const year = anchor.getFullYear() + index;
  return new Date(year, anchor.getMonth(), Math.min(anchor.getDate(), daysInMonth(year, anchor.getMonth())), 12);
}

export function occurrenceDatesBetween(
  anchorValue: string,
  rule: EventRecurrenceRule,
  rangeStartValue: string,
  rangeEndValue: string,
): string[] {
  const anchor = parseLocalDateOnly(anchorValue);
  const rangeStart = parseLocalDateOnly(rangeStartValue);
  const rangeEnd = parseLocalDateOnly(rangeEndValue);
  if (!anchor || !rangeStart || !rangeEnd || rangeStart > rangeEnd) return [];
  if (rule === "none") return anchor >= rangeStart && anchor <= rangeEnd ? [anchorValue] : [];

  const results: string[] = [];
  const approximateIndex = rule === "weekly"
    ? Math.max(0, Math.floor((rangeStart.getTime() - anchor.getTime()) / 604_800_000) - 1)
    : rule === "monthly"
      ? Math.max(0, (rangeStart.getFullYear() - anchor.getFullYear()) * 12 + rangeStart.getMonth() - anchor.getMonth() - 1)
      : Math.max(0, rangeStart.getFullYear() - anchor.getFullYear() - 1);

  for (let index = approximateIndex; index < approximateIndex + 800; index += 1) {
    const occurrence = occurrenceAt(anchor, rule, index);
    if (occurrence > rangeEnd) break;
    if (occurrence >= anchor && occurrence >= rangeStart) results.push(formatLocalDateOnly(occurrence));
  }
  return results;
}

export function expandCalendarEventOccurrences(
  events: CalendarEventRecord[],
  rangeStart: string,
  rangeEnd: string,
): CalendarEventOccurrence[] {
  return events.flatMap((event) => {
    const rule = event.category === "birthday" ? "none" : event.recurrenceRule;
    return occurrenceDatesBetween(event.date, rule, rangeStart, rangeEnd).map((date) => ({
      ...event,
      id: rule === "none" ? event.id : `${event.id}:${date}`,
      sourceEventId: event.id,
      date,
    }));
  });
}

export function nextCalendarEventOccurrence(
  anchor: string,
  rule: EventRecurrenceRule,
  now = new Date(),
): string | null {
  if (Number.isNaN(now.getTime())) return null;
  const today = formatLocalDateOnly(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const end = formatLocalDateOnly(new Date(now.getFullYear() + 6, 11, 31));
  return occurrenceDatesBetween(anchor, rule, today, end)[0] ?? null;
}
