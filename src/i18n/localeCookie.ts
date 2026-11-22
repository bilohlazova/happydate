import { isSupportedLocale, LOCALE_COOKIE_NAME, type AppLocale } from "./config.ts";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function getLocaleCookie(cookieSource = typeof document === "undefined" ? "" : document.cookie): AppLocale | null {
  for (const part of cookieSource.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName !== LOCALE_COOKIE_NAME) continue;
    try {
      const value = decodeURIComponent(rawValue.join("="));
      return isSupportedLocale(value) ? value : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function buildLocaleCookie(locale: AppLocale, secure: boolean): string {
  if (!isSupportedLocale(locale)) throw new TypeError("Unsupported application locale");
  return [
    `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}`,
    "Path=/",
    `Max-Age=${LOCALE_COOKIE_MAX_AGE}`,
    "SameSite=Lax",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

export const LOCALE_STORAGE_KEY = "happydate_locale";

/** Same-module fallback for native webviews that may drop cookies between launches. */
export function getStoredLocale(): AppLocale | null {
  try {
    const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isSupportedLocale(value) ? value : null;
  } catch {
    return null;
  }
}

export const LOCALE_META_KEY = "happydate_locale_meta";

/** Who made the manual choice (null = guest) and whether the profile write is unconfirmed. */
export type LocaleMeta = { ownerId: string | null; pending: boolean };

export function getLocaleMeta(): LocaleMeta | null {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(LOCALE_META_KEY) ?? "null");
    if (typeof parsed !== "object" || parsed === null) return null;
    const { ownerId, pending } = parsed as Record<string, unknown>;
    if ((typeof ownerId !== "string" && ownerId !== null) || typeof pending !== "boolean") return null;
    return { ownerId, pending };
  } catch {
    return null;
  }
}

function writeLocaleMeta(meta: LocaleMeta): void {
  try {
    window.localStorage.setItem(LOCALE_META_KEY, JSON.stringify(meta));
  } catch {
    // Storage may be unavailable; without metadata the choice is treated as unowned.
  }
}

export function setLocaleCookie(locale: AppLocale, ownerId: string | null = null, pending = false): void {
  document.cookie = buildLocaleCookie(locale, process.env.NODE_ENV === "production");
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage may be unavailable (private mode); the cookie still applies.
  }
  writeLocaleMeta({ ownerId, pending });
}

/** Call only after Supabase confirmed the profile write. */
export function markLocaleSynced(ownerId: string): void {
  writeLocaleMeta({ ownerId, pending: false });
}

/** Drops a choice that belongs to another account so the device language applies. */
export function clearLocaleChoice(): void {
  document.cookie = `${LOCALE_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
  try {
    window.localStorage.removeItem(LOCALE_STORAGE_KEY);
    window.localStorage.removeItem(LOCALE_META_KEY);
  } catch {
    // Nothing else to clean up.
  }
}
