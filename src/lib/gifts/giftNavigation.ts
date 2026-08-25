export type GiftOccasionKey = "birthday" | "anniversary" | "personal" | "general";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPersistedCalendarEventId(eventId: string | null | undefined): eventId is string {
  return typeof eventId === "string" && UUID_PATTERN.test(eventId);
}

export function canonicalGiftOccasion(category: string | null | undefined): GiftOccasionKey {
  if (category === "birthday") return "birthday";
  if (category === "anniversary") return "anniversary";
  if (category === "personal") return "personal";
  return "general";
}

export function buildGiftStartHref(input: {
  personId: string;
  eventId?: string | null;
  date?: string | null;
  title?: string | null;
  category?: string | null;
  returnTo?: string | null;
}): string {
  const params = new URLSearchParams({
    personId: input.personId,
    occasion: canonicalGiftOccasion(input.category),
  });
  if (isPersistedCalendarEventId(input.eventId)) params.set("eventId", input.eventId);
  if (input.date) params.set("date", input.date);
  if (input.title) params.set("title", input.title.replace(/^🎂\s*/, "").trim());
  if (input.returnTo?.startsWith("/") && !input.returnTo.startsWith("//")) params.set("returnTo", input.returnTo);
  return `/gift/start?${params.toString()}`;
}
