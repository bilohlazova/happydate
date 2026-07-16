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

export function setLocaleCookie(locale: AppLocale): void {
  document.cookie = buildLocaleCookie(locale, process.env.NODE_ENV === "production");
}
