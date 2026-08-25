export type CalendarSearchKind = "event" | "birthday" | "holiday";

export type CalendarSearchEntry<T = unknown> = {
  id: string;
  kind: CalendarSearchKind;
  title: string;
  date: string;
  searchText: string;
  payload: T;
};

export function normalizeCalendarSearchText(value: string, locale?: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase(locale)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function dateDistance(date: string, today: string) {
  const delta = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  return delta >= 0 ? delta : 10_000 + Math.abs(delta);
}

export function searchCalendarEntries<T>(
  entries: CalendarSearchEntry<T>[],
  query: string,
  locale: string,
  today: string,
  limit = 30,
) {
  const normalizedQuery = normalizeCalendarSearchText(query, locale);
  const tokens = normalizedQuery.split(" ").filter(Boolean);

  return entries
    .map((entry) => {
      const title = normalizeCalendarSearchText(entry.title, locale);
      const haystack = normalizeCalendarSearchText(`${entry.title} ${entry.searchText}`, locale);
      if (tokens.length > 0 && !tokens.every((token) => haystack.includes(token))) return null;

      let relevance = 60;
      if (!normalizedQuery) relevance = 0;
      else if (title === normalizedQuery) relevance = 0;
      else if (title.startsWith(normalizedQuery)) relevance = 10;
      else if (title.split(" ").some((word) => word.startsWith(normalizedQuery))) relevance = 20;
      else if (title.includes(normalizedQuery)) relevance = 30;
      else if (tokens.every((token) => title.split(" ").some((word) => word.startsWith(token)))) relevance = 40;

      return { entry, relevance, distance: dateDistance(entry.date, today) };
    })
    .filter((item): item is { entry: CalendarSearchEntry<T>; relevance: number; distance: number } => item !== null)
    .sort((left, right) => left.relevance - right.relevance || left.distance - right.distance || left.entry.title.localeCompare(right.entry.title, locale))
    .slice(0, limit)
    .map(({ entry }) => entry);
}
