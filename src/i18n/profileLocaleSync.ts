import { DEFAULT_LOCALE, type AppLocale } from "./config.ts";

export function resolveAuthenticatedLocale(
  profileLocale: AppLocale | null,
  cookieLocale: AppLocale | null,
  browserLocale: AppLocale | null,
): AppLocale {
  return profileLocale ?? cookieLocale ?? browserLocale ?? DEFAULT_LOCALE;
}

export function shouldSynchronizeProfileLocale(
  profileLocale: AppLocale | null,
  cookieLocale: AppLocale | null,
): profileLocale is AppLocale {
  return profileLocale !== null && profileLocale !== cookieLocale;
}

/**
 * The cookie only exists after an explicit manual choice (device-language
 * detection never writes it). If the profile has no saved locale yet, that
 * choice must be persisted so it is restored after sign-out / sign-in.
 */
export function shouldBackfillProfileLocale(
  profileLocale: AppLocale | null,
  cookieLocale: AppLocale | null,
): cookieLocale is AppLocale {
  return profileLocale === null && cookieLocale !== null;
}
