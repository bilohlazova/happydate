import "server-only";

import type { AbstractIntlMessages } from "next-intl";
import { DEFAULT_LOCALE, type AppLocale } from "./config";

type CommonMessages = typeof import("../../messages/pl/common.json");
type NavigationMessages = typeof import("../../messages/pl/navigation.json");
type ProfileMessages = typeof import("../../messages/pl/profile.json");
type AuthMessages = typeof import("../../messages/pl/auth.json");
type PeopleMessages = typeof import("../../messages/pl/people.json");
type PersonMessages = typeof import("../../messages/pl/person.json");
type PersonFormMessages = typeof import("../../messages/pl/personForm.json");
type NotesMessages = typeof import("../../messages/pl/notes.json");
type RemindersMessages = typeof import("../../messages/pl/reminders.json");
type HomeMessages = typeof import("../../messages/pl/home.json");

export interface AppMessages extends AbstractIntlMessages {
  common: CommonMessages;
  navigation: NavigationMessages;
  profile: ProfileMessages;
  auth: AuthMessages;
  people: PeopleMessages;
  person: PersonMessages;
  personForm: PersonFormMessages;
  notes: NotesMessages;
  reminders: RemindersMessages;
  home: HomeMessages;
}

type CommonMessageLoader = () => Promise<CommonMessages>;
type NavigationMessageLoader = () => Promise<NavigationMessages>;
type ProfileMessageLoader = () => Promise<ProfileMessages>;
type AuthMessageLoader = () => Promise<AuthMessages>;
type PeopleMessageLoader = () => Promise<PeopleMessages>;
type PersonMessageLoader = () => Promise<PersonMessages>;
type PersonFormMessageLoader = () => Promise<PersonFormMessages>;
type NotesMessageLoader = () => Promise<NotesMessages>;
type RemindersMessageLoader = () => Promise<RemindersMessages>;
type HomeMessageLoader = () => Promise<HomeMessages>;

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
const PEOPLE_MESSAGE_LOADERS: Record<AppLocale, PeopleMessageLoader> = {
  pl: () => import("../../messages/pl/people.json").then((module) => module.default),
  uk: () => import("../../messages/uk/people.json").then((module) => module.default),
  en: () => import("../../messages/en/people.json").then((module) => module.default),
  ru: () => import("../../messages/ru/people.json").then((module) => module.default),
  de: () => import("../../messages/de/people.json").then((module) => module.default),
};
const PERSON_MESSAGE_LOADERS: Record<AppLocale, PersonMessageLoader> = {
  pl: () => import("../../messages/pl/person.json").then((module) => module.default),
  uk: () => import("../../messages/uk/person.json").then((module) => module.default),
  en: () => import("../../messages/en/person.json").then((module) => module.default),
  ru: () => import("../../messages/ru/person.json").then((module) => module.default),
  de: () => import("../../messages/de/person.json").then((module) => module.default),
};
const PERSON_FORM_MESSAGE_LOADERS: Record<AppLocale, PersonFormMessageLoader> = {
  pl: () => import("../../messages/pl/personForm.json").then((module) => module.default),
  uk: () => import("../../messages/uk/personForm.json").then((module) => module.default),
  en: () => import("../../messages/en/personForm.json").then((module) => module.default),
  ru: () => import("../../messages/ru/personForm.json").then((module) => module.default),
  de: () => import("../../messages/de/personForm.json").then((module) => module.default),
};
const NOTES_MESSAGE_LOADERS: Record<AppLocale, NotesMessageLoader> = {
  pl: () => import("../../messages/pl/notes.json").then((module) => module.default),
  uk: () => import("../../messages/uk/notes.json").then((module) => module.default),
  en: () => import("../../messages/en/notes.json").then((module) => module.default),
  ru: () => import("../../messages/ru/notes.json").then((module) => module.default),
  de: () => import("../../messages/de/notes.json").then((module) => module.default),
};
const REMINDERS_MESSAGE_LOADERS: Record<AppLocale, RemindersMessageLoader> = {
  pl: () => import("../../messages/pl/reminders.json").then((module) => module.default),
  uk: () => import("../../messages/uk/reminders.json").then((module) => module.default),
  en: () => import("../../messages/en/reminders.json").then((module) => module.default),
  ru: () => import("../../messages/ru/reminders.json").then((module) => module.default),
  de: () => import("../../messages/de/reminders.json").then((module) => module.default),
};
const HOME_MESSAGE_LOADERS: Record<AppLocale, HomeMessageLoader> = {
  pl: () => import("../../messages/pl/home.json").then((module) => module.default),
  uk: () => import("../../messages/uk/home.json").then((module) => module.default),
  en: () => import("../../messages/en/home.json").then((module) => module.default),
  ru: () => import("../../messages/ru/home.json").then((module) => module.default),
  de: () => import("../../messages/de/home.json").then((module) => module.default),
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

async function loadPeopleMessages(locale: AppLocale): Promise<PeopleMessages> {
  try { return await PEOPLE_MESSAGE_LOADERS[locale](); }
  catch (error) {
    if (locale === DEFAULT_LOCALE || process.env.NODE_ENV === "development") throw error;
    return PEOPLE_MESSAGE_LOADERS[DEFAULT_LOCALE]();
  }
}

async function loadPersonMessages(locale: AppLocale): Promise<PersonMessages> {
  try { return await PERSON_MESSAGE_LOADERS[locale](); }
  catch (error) {
    if (locale === DEFAULT_LOCALE || process.env.NODE_ENV === "development") throw error;
    return PERSON_MESSAGE_LOADERS[DEFAULT_LOCALE]();
  }
}

async function loadPersonFormMessages(locale: AppLocale): Promise<PersonFormMessages> {
  try { return await PERSON_FORM_MESSAGE_LOADERS[locale](); }
  catch (error) {
    if (locale === DEFAULT_LOCALE || process.env.NODE_ENV === "development") throw error;
    return PERSON_FORM_MESSAGE_LOADERS[DEFAULT_LOCALE]();
  }
}

export async function loadMessages(locale: AppLocale): Promise<AppMessages> {
  const [common, navigation, profile, auth, people, person, personForm, notes, reminders, home] = await Promise.all([
    loadCommonMessages(locale),
    loadNavigationMessages(locale),
    loadProfileMessages(locale),
    loadAuthMessages(locale),
    loadPeopleMessages(locale),
    loadPersonMessages(locale),
    loadPersonFormMessages(locale),
    NOTES_MESSAGE_LOADERS[locale](),
    REMINDERS_MESSAGE_LOADERS[locale](),
    HOME_MESSAGE_LOADERS[locale](),
  ]);
  return { common, navigation, profile, auth, people, person, personForm, notes, reminders, home };
}
