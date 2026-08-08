import {
  activateReminderForOccurrence,
  cancelActiveRemindersForEvent,
} from "@/lib/repositories/reminders";
import { calendarReminderStart } from "./calendarReminderTiming";
import { nextCalendarEventOccurrence } from "@/lib/events/eventRecurrence";
import type { EventRecurrenceRule } from "@/lib/repositories/events/events.types";

export async function reconcileCalendarEventReminder(input: {
  eventId: string;
  occurrenceDate: string;
  recurrenceRule?: EventRecurrenceRule;
  enabled: boolean;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  await cancelActiveRemindersForEvent(input.eventId, now);
  if (!input.enabled) return;
  const occurrenceDate = nextCalendarEventOccurrence(
    input.occurrenceDate,
    input.recurrenceRule ?? "none",
    now,
  );
  if (!occurrenceDate) return;
  const nextRemindAt = calendarReminderStart(occurrenceDate, now);
  if (!nextRemindAt) return;
  await activateReminderForOccurrence({
    eventId: input.eventId,
    occurrenceDate,
    actionKind: "prepare",
    nextRemindAt,
  });
}
