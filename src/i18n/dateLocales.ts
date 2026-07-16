import { de, enUS, pl, ru, uk } from "date-fns/locale";
import type { Locale } from "date-fns";

import type { AppLocale } from "./config.ts";

const DATE_FNS_LOCALES: Record<AppLocale, Locale> = {
  pl,
  uk,
  en: enUS,
  ru,
  de,
};

export function getDateFnsLocale(locale: AppLocale): Locale {
  return DATE_FNS_LOCALES[locale];
}
