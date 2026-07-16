import "server-only";

import type { AbstractIntlMessages } from "next-intl";
import { DEFAULT_LOCALE, type AppLocale } from "./config";

type CommonMessages = typeof import("../../messages/pl/common.json");
type NavigationMessages = typeof import("../../messages/pl/navigation.json");
type ProfileMessages = typeof import("../../messages/pl/profile.json");
type AuthMessages = typeof import("../../messages/pl/auth.json");

export interface AppMessages extends AbstractIntlMessages {
  common: CommonMessages;
  navigation: NavigationMessages;
  profile: ProfileMessages;
  auth: AuthMessages;
}

type CommonMessageLoader = () => Promise<CommonMessages>;
type NavigationMessageLoader = () => Promise<NavigationMessages>;
type ProfileMessageLoader = () => Promise<ProfileMessages>;
type AuthMessageLoader = () => Promise<AuthMessages>;

const COMMON_MESSAGE_LOADERS: Record<AppLocale, CommonMessageLoader> = {
  pl: () => import("../../messages/pl/common.json").then((module) => module.default),
  uk: () => import("../../messages/uk/common.json").then((module) => module.default),
  en: () => import("../../messages/en/common.json").then((module) => module.default),
  ru: () => import("../../messages/ru/common.json").then((module) => module.default),
  de: () => import("../../messages/de/common.json").then((module) => module.default),
};

const NAVIGATION_MESSAGE_LOADERS: Record<AppLocale, NavigationMessageLoader> = {
  pl: () => import("../../messages/pl/navigation.json").then((module) => module.default),
  uk: () => import("../../messages/uk/navigation.json").then((module) => module.default),
  en: () => import("../../messages/en/navigation.json").then((module) => module.default),
  ru: () => import("../../messages/ru/navigation.json").then((module) => module.default),
  de: () => import("../../messages/de/navigation.json").then((module) => module.default),
};

const PROFILE_MESSAGE_LOADERS: Record<AppLocale, ProfileMessageLoader> = {
  pl: () => import("../../messages/pl/profile.json").then((module) => module.default),
  uk: () => import("../../messages/uk/profile.json").then((module) => module.default),
  en: () => import("../../messages/en/profile.json").then((module) => module.default),
  ru: () => import("../../messages/ru/profile.json").then((module) => module.default),
  de: () => import("../../messages/de/profile.json").then((module) => module.default),
};

const AUTH_MESSAGE_LOADERS: Record<AppLocale, AuthMessageLoader> = {
  pl: () => import("../../messages/pl/auth.json").then((module) => module.default),
  uk: () => import("../../messages/uk/auth.json").then((module) => module.default),
  en: () => import("../../messages/en/auth.json").then((module) => module.default),
  ru: () => import("../../messages/ru/auth.json").then((module) => module.default),
  de: () => import("../../messages/de/auth.json").then((module) => module.default),
};

async function loadCommonMessages(locale: AppLocale): Promise<CommonMessages> {
  try {
    return await COMMON_MESSAGE_LOADERS[locale]();
  } catch (error) {
    if (locale === DEFAULT_LOCALE || process.env.NODE_ENV === "development") {
      throw new Error(`[i18n] Failed to load messages for locale "${locale}".`, {
        cause: error,
      });
    }

    console.error(`[i18n] Messages unavailable for locale "${locale}"; using Polish.`);
    return COMMON_MESSAGE_LOADERS[DEFAULT_LOCALE]();
  }
}

async function loadNavigationMessages(
  locale: AppLocale,
): Promise<NavigationMessages> {
  try {
    return await NAVIGATION_MESSAGE_LOADERS[locale]();
  } catch (error) {
    if (locale === DEFAULT_LOCALE || process.env.NODE_ENV === "development") {
      throw new Error(
        `[i18n] Failed to load navigation messages for locale "${locale}".`,
        { cause: error },
      );
    }

    console.error(
      `[i18n] Navigation messages unavailable for locale "${locale}"; using Polish.`,
    );
    return NAVIGATION_MESSAGE_LOADERS[DEFAULT_LOCALE]();
  }
}

async function loadProfileMessages(locale: AppLocale): Promise<ProfileMessages> {
  try {
    return await PROFILE_MESSAGE_LOADERS[locale]();
  } catch (error) {
    if (locale === DEFAULT_LOCALE || process.env.NODE_ENV === "development") {
      throw new Error(`[i18n] Failed to load profile messages for locale "${locale}".`, { cause: error });
    }
    console.error(`[i18n] Profile messages unavailable for locale "${locale}"; using Polish.`);
    return PROFILE_MESSAGE_LOADERS[DEFAULT_LOCALE]();
  }
}

async function loadAuthMessages(locale: AppLocale): Promise<AuthMessages> {
  try {
    return await AUTH_MESSAGE_LOADERS[locale]();
  } catch (error) {
    if (locale === DEFAULT_LOCALE || process.env.NODE_ENV === "development") {
      throw new Error(`[i18n] Failed to load auth messages for locale "${locale}".`, { cause: error });
    }
    console.error(`[i18n] Auth messages unavailable for locale "${locale}"; using Polish.`);
    return AUTH_MESSAGE_LOADERS[DEFAULT_LOCALE]();
  }
}

export async function loadMessages(locale: AppLocale): Promise<AppMessages> {
  const [common, navigation, profile, auth] = await Promise.all([
    loadCommonMessages(locale),
    loadNavigationMessages(locale),
    loadProfileMessages(locale),
    loadAuthMessages(locale),
  ]);
  return { common, navigation, profile, auth };
}
