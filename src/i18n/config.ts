export const SUPPORTED_LOCALES = ["pl", "uk", "en", "ru", "de"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "pl";
export const LOCALE_COOKIE_NAME = "happydate_locale";

export function isSupportedLocale(value: unknown): value is AppLocale {
  return (
    typeof value === "string" &&
    SUPPORTED_LOCALES.includes(value as AppLocale)
  );
}

export function normalizeLocale(value: unknown): AppLocale | null {
  if (typeof value !== "string") return null;
  const language = value.trim().replaceAll("_", "-").split("-")[0]?.toLowerCase();
  return isSupportedLocale(language) ? language : null;
}

function getAcceptedLanguages(acceptLanguage: string | null | undefined): string[] {
  if (!acceptLanguage) return [];

  return acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...parameters] = part.trim().split(";");
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().startsWith("q="),
      );
      const parsedQuality = qualityParameter
        ? Number(qualityParameter.trim().slice(2))
        : 1;
      return {
        tag,
        quality: Number.isFinite(parsedQuality) ? parsedQuality : 0,
        index,
      };
    })
    .filter(({ tag, quality }) => Boolean(tag) && quality > 0)
    .sort(
      (first, second) =>
        second.quality - first.quality || first.index - second.index,
    )
    .map(({ tag }) => tag);
}

/** Resolve an explicit cookie before the browser's Accept-Language header. */
export function resolveRequestLocale(
  cookieLocale: string | null | undefined,
  acceptLanguage: string | null | undefined,
): AppLocale {
  const savedLocale = normalizeLocale(cookieLocale);
  if (savedLocale) return savedLocale;

  for (const language of getAcceptedLanguages(acceptLanguage)) {
    const locale = normalizeLocale(language);
    if (locale) return locale;
  }

  return DEFAULT_LOCALE;
}
