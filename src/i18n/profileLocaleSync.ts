import type { AppLocale } from "./config.ts";

export function resolveAuthenticatedLocale(
  profileLocale: AppLocale | null,
  cookieLocale: AppLocale | null,
  browserLocale: AppLocale | null,
): AppLocale {
  return profileLocale ?? cookieLocale ?? browserLocale ?? "pl";
}

export function shouldSynchronizeProfileLocale(
  profileLocale: AppLocale | null,
  cookieLocale: AppLocale | null,
): profileLocale is AppLocale {
  return profileLocale !== null && profileLocale !== cookieLocale;
}
