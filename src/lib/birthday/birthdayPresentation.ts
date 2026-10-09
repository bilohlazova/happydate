import { assistantLocalDate } from "../assistant/assistantLocalDate.ts";
import { GIFT_LIFECYCLE, type GiftLifecycle } from "../gifts/gift.types.ts";

export type BirthdayUrgency = "normal" | "critical";
type Gift = { personId: string | null; eventId: string | null; lifecycle: string };

/** Existing Gift lifecycle: an idea alone does not mean a gift is ready. */
export function hasMatchingBirthdayGift(gifts: readonly Gift[], personId: string | null, eventId: string | null): boolean {
  return Boolean(personId && eventId && gifts.some((gift) => gift.personId === personId && gift.eventId === eventId
    && GIFT_LIFECYCLE.includes(gift.lifecycle as GiftLifecycle) && gift.lifecycle !== "idea"));
}

export function birthdayCalendarDaysUntil(occurrence: string, now: Date, timezone: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurrence)) return null;
  const target = new Date(`${occurrence}T00:00:00Z`);
  if (!Number.isFinite(target.getTime()) || target.toISOString().slice(0, 10) !== occurrence) return null;
  return Math.round((target.getTime() - Date.parse(`${assistantLocalDate(now, timezone)}T00:00:00Z`)) / 86_400_000);
}

export function resolveBirthdayUrgency(input: { occurrence: string; daysUntil: number | null; giftReady: boolean }): BirthdayUrgency {
  const { daysUntil } = input;
  const date = new Date(`${input.occurrence}T00:00:00Z`);
  const validOccurrence = /^\d{4}-\d{2}-\d{2}$/.test(input.occurrence)
    && Number.isFinite(date.getTime())
    && date.toISOString().slice(0, 10) === input.occurrence;
  return validOccurrence && daysUntil !== null && Number.isInteger(daysUntil) && daysUntil >= 0 && daysUntil <= 3 && !input.giftReady
    ? "critical" : "normal";
}
