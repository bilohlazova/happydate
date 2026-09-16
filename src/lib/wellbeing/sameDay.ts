export function isSameLocalCalendarDay(timestamp: string | null | undefined, now = new Date(), timezone?: string): boolean {
  if (!timestamp) return false;
  const parsed = new Date(timestamp);
  if (!Number.isFinite(parsed.getTime()) || !Number.isFinite(now.getTime())) return false;
  const resolvedTimezone = timezone || (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC");
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: resolvedTimezone, year: "numeric", month: "2-digit", day: "2-digit" });
    return formatter.format(parsed) === formatter.format(now);
  } catch {
    return false;
  }
}
