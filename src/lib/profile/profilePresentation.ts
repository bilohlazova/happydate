import { format } from "date-fns";

import { isSupportedLocale, type AppLocale } from "../../i18n/config.ts";
import { getDateFnsLocale } from "../../i18n/dateLocales.ts";

export function parseProfileCalendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatProfileMemberSince(value: string, locale: AppLocale): string | null {
  if (!isSupportedLocale(locale)) return null;
  const date = parseProfileCalendarDate(value);
  return date ? format(date, "LLLL yyyy", { locale: getDateFnsLocale(locale) }) : null;
}
