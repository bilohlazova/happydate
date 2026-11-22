import { DEFAULT_LOCALE, type AppLocale } from "./config.ts";
import type { LocaleMeta } from "./localeCookie.ts";

export function resolveAuthenticatedLocale(
  profileLocale: AppLocale | null,
  cookieLocale: AppLocale | null,
  browserLocale: AppLocale | null,
): AppLocale {
  return profileLocale ?? cookieLocale ?? browserLocale ?? DEFAULT_LOCALE;
}

export type LoginLocaleAction =
  | { type: "none" }
  | { type: "claim" } // same locale in profile and cookie: just record ownership
  | { type: "applyProfile"; locale: AppLocale }
  | { type: "pushToProfile"; locale: AppLocale }
  | { type: "discardCookie" }; // cookie belongs to another account; use device language

/**
 * Decides how the locale cookie and the signed-in user's profile reconcile.
 * The cookie is only ever written by a manual choice. `meta.ownerId` records
 * who made it, so one account's choice is never copied into another profile.
 */
export function resolveLoginLocaleAction(
  userId: string,
  profileLocale: AppLocale | null,
  cookieLocale: AppLocale | null,
  meta: LocaleMeta | null,
): LoginLocaleAction {
  if (!cookieLocale) return profileLocale ? { type: "applyProfile", locale: profileLocale } : { type: "none" };

  const owned = meta?.ownerId === userId;
  const guestChoice = meta !== null && meta.ownerId === null;

  // Unconfirmed manual write of this user: it wins over the stale profile and is retried.
  if (owned && meta.pending) return { type: "pushToProfile", locale: cookieLocale };

  // A guest's choice made just before sign-in is used only when the profile has none.
  if (guestChoice || owned) {
    if (!profileLocale) return { type: "pushToProfile", locale: cookieLocale };
    if (profileLocale === cookieLocale) return owned ? { type: "none" } : { type: "claim" };
    return { type: "applyProfile", locale: profileLocale };
  }

  // Foreign or unknown owner: this account's own settings apply, never the previous account's.
  if (!profileLocale) return { type: "discardCookie" };
  return profileLocale === cookieLocale ? { type: "claim" } : { type: "applyProfile", locale: profileLocale };
}
