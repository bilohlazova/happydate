/** Resolves a YYYY-MM-DD date in an owner-controlled IANA timezone. */
export function assistantLocalDate(date: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const value = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value;
    const year = value("year");
    const month = value("month");
    const day = value("day");
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Invalid legacy settings fail safely to UTC.
  }
  return date.toISOString().slice(0, 10);
}
