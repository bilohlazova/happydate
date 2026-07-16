import type { AppLocale } from "./config.ts";

export const LANGUAGE_OPTIONS: ReadonlyArray<{
  locale: AppLocale;
  code: string;
  nativeName: string;
}> = [
  { locale: "pl", code: "PL", nativeName: "Polski" },
  { locale: "uk", code: "UK", nativeName: "Українська" },
  { locale: "en", code: "EN", nativeName: "English" },
  { locale: "ru", code: "RU", nativeName: "Русский" },
  { locale: "de", code: "DE", nativeName: "Deutsch" },
];

export function getLanguageOption(locale: AppLocale) {
  return LANGUAGE_OPTIONS.find((option) => option.locale === locale) ?? LANGUAGE_OPTIONS[0];
}
