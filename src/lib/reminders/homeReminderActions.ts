import type { HomeFeaturedEvent } from "@/lib/home/home.types";
import { ensureBirthdayOccurrence } from "@/lib/repositories/events";
import {
  ensureReminderForOccurrence,
  type ReminderRecord,
} from "@/lib/repositories/reminders";

export async function ensureHomeReminder(
  event: HomeFeaturedEvent,
  now = new Date(),
): Promise<ReminderRecord | null> {
  if (!event.isImportant || event.daysUntil < 0 || event.daysUntil > 30) return null;

  let eventId = event.id;
  if (event.source === "birthday") {
    if (!event.personId || !event.personName) return null;
    eventId = await ensureBirthdayOccurrence({
      personId: event.personId,
      personName: event.personName,
      occurrenceDate: event.date,
    });
  }

  return ensureReminderForOccurrence({
    eventId,
    occurrenceDate: event.date,
    actionKind: "congratulate",
    nextRemindAt: now.toISOString(),
  });
}

