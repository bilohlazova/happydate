import { isSupportedLocale, type AppLocale } from "./config.ts";

export type LocaleChangeDependencies = {
  isAuthenticated: boolean;
  setCookie: (locale: AppLocale) => void;
  updateProfile: (locale: AppLocale) => Promise<void>;
  refresh: () => void;
  /** Called only after the profile write was confirmed. */
  markSynced?: () => void;
};

export type LocaleChangeResult = { profileSyncFailed: boolean };

export async function changeApplicationLocale(
  locale: AppLocale,
  dependencies: LocaleChangeDependencies,
): Promise<LocaleChangeResult> {
  if (!isSupportedLocale(locale)) throw new TypeError("Unsupported application locale");

  dependencies.setCookie(locale);
  let profileSyncFailed = false;
  if (dependencies.isAuthenticated) {
    try {
      await dependencies.updateProfile(locale);
      dependencies.markSynced?.();
    } catch {
      profileSyncFailed = true;
    }
  }
  dependencies.refresh();
  return { profileSyncFailed };
}
