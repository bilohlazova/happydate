import { isSupportedLocale, type AppLocale } from "../../../i18n/config.ts";

export type ApplicationProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  preferred_locale: AppLocale | null;
};

export function parsePreferredLocale(value: unknown): AppLocale | null {
  return isSupportedLocale(value) ? value : null;
}

export function buildPreferredLocaleUpdate(locale: AppLocale): { preferred_locale: AppLocale } {
  if (!isSupportedLocale(locale)) throw new TypeError("Unsupported application locale");
  return { preferred_locale: locale };
}
