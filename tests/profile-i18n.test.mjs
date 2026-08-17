import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createTranslator } from "next-intl";

import { formatProfileMemberSince, parseProfileCalendarDate } from "../src/lib/profile/profilePresentation.ts";

const root = process.cwd();
const locales = ["pl", "uk", "en", "ru", "de"];

async function profileMessages(locale) {
  return JSON.parse(await readFile(path.join(root, "messages", locale, "profile.json"), "utf8"));
}

async function translate(locale) {
  return createTranslator({ locale, messages: { profile: await profileMessages(locale) } });
}

const expectedTitles = { pl: "Profil", uk: "Профіль", en: "Profile", ru: "Профиль", de: "Profil" };
const expectedLanguageRows = {
  pl: "Język aplikacji", uk: "Мова застосунку", en: "Application language",
  ru: "Язык приложения", de: "Anwendungssprache",
};
const expectedLogout = { pl: "Wyloguj się", uk: "Вийти", en: "Log out", ru: "Выйти", de: "Abmelden" };

for (const locale of locales) {
  test(`${locale} Profile title is localized`, async () => {
    assert.equal((await translate(locale))("profile.title"), expectedTitles[locale]);
  });
}

test("language row and logout are localized in every locale", async () => {
  for (const locale of locales) {
    const t = await translate(locale);
    assert.equal(t("profile.settings.language.title"), expectedLanguageRows[locale]);
    assert.equal(t("profile.actions.logout"), expectedLogout[locale]);
  }
});

test("Profile validation/error surfaces have complete safe messages", async () => {
  for (const locale of locales) {
    const messages = await profileMessages(locale);
    for (const key of ["saveFailed", "avatarSaveFailed", "uploadFailed"]) {
      assert.equal(typeof messages.errors[key], "string");
      assert.notEqual(messages.errors[key].trim(), "");
    }
  }
});

test("member-since date follows the selected locale", () => {
  const input = "2024-07-01T23:30:00.000Z";
  assert.deepEqual(
    locales.map((locale) => formatProfileMemberSince(input, locale)),
    ["lipiec 2024", "липень 2024", "July 2024", "июль 2024", "Juli 2024"],
  );
});

test("profile calendar dates preserve the source day without UTC conversion", () => {
  const date = parseProfileCalendarDate("2024-01-01T23:30:00.000Z");
  assert.ok(date);
  assert.equal(date.getFullYear(), 2024);
  assert.equal(date.getMonth(), 0);
  assert.equal(date.getDate(), 1);
  assert.equal(parseProfileCalendarDate("not-a-date"), null);
});

test("Profile links to available account controls and leaves only future settings non-interactive", async () => {
  const source = await readFile(path.join(root, "src/app/(app)/profile/page.tsx"), "utf8");
  const routes = [
    ...source.matchAll(/href="([^"]+)"/g),
    ...source.matchAll(/href:\s*"([^"]+)"/g),
  ].map((match) => match[1]);
  assert.deepEqual(routes, ["/survey", "/settings/reminders", "/settings/reminders", "/auth/reset", "/settings/sessions", "/privacy", "/settings/export", "/settings/delete-account"]);
  assert.equal(routes.some((route) => /^\/(pl|uk|en|ru|de)(\/|$)/.test(route)), false);
  for (const route of ["/settings/reminders", "/auth/reset", "/settings/sessions", "/settings/export", "/settings/delete-account"]) {
    assert.match(source, new RegExp(route.replaceAll("/", "\\/")));
  }
  for (const route of ["/settings/notifications", "/settings/ai", "/settings/password", "/care/manage"]) {
    assert.doesNotMatch(source, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.match(source, /comingSoon: true/);
  assert.match(source, /aria-disabled="true"/);
});

test("Profile reuses the shared LanguageSwitcher", async () => {
  const source = await readFile(path.join(root, "src/app/(app)/profile/page.tsx"), "utf8");
  assert.match(source, /<LanguageSwitcher isAuthenticated variant="profile" \/>/);
  assert.doesNotMatch(source, /setLocaleCookie|changeApplicationLocale|preferred_locale/);
});

test("user profile values remain direct, untranslated values", async () => {
  const source = await readFile(path.join(root, "src/app/(app)/profile/page.tsx"), "utf8");
  assert.match(source, /\{fullName \|\| translate\("hero\.defaultName"\)\}/);
  assert.match(source, /\{email\s*&& <p[^>]*>\{email\}<\/p>\}/);
  assert.match(source, /value=\{fullName\}/);
});

test("Profile UI never renders raw Supabase errors", async () => {
  const source = await readFile(path.join(root, "src/app/(app)/profile/page.tsx"), "utf8");
  assert.doesNotMatch(source, /error\.message|setMessage\(msg\)/);
  assert.match(source, /translate\("errors\.saveFailed"\)/);
  assert.match(source, /translate\("errors\.uploadFailed"\)/);
});

test("Profile dictionaries have no empty values or accidental Polish copies", async () => {
  const flatten = (value, prefix = "", result = {}) => {
    for (const [key, child] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${key}` : key;
      if (child && typeof child === "object") flatten(child, next, result);
      else result[next] = child;
    }
    return result;
  };
  const polish = flatten(await profileMessages("pl"));
  const allowed = new Set(["title", "hero.care", "exportSettings.back", "sessionSettings.back", "deleteAccountSettings.back"]);
  for (const locale of ["uk", "en", "ru", "de"]) {
    const values = flatten(await profileMessages(locale));
    assert.deepEqual(Object.keys(values).sort(), Object.keys(polish).sort());
    for (const [key, value] of Object.entries(values)) {
      assert.equal(typeof value, "string");
      assert.notEqual(value.trim(), "");
      if (!allowed.has(key)) assert.notEqual(value, polish[key], `${locale}:${key} copied Polish`);
    }
  }
});

test("German critical actions use fluid rows rather than fixed text widths", async () => {
  const [profile, css] = await Promise.all([
    profileMessages("de"),
    readFile(path.join(root, "src/app/globals.css"), "utf8"),
  ]);
  for (const value of [profile.account.save, profile.security.title, profile.security.deleteAccount]) {
    assert.notEqual(value.trim(), "");
  }
  assert.match(css, /\.pr-row\s*\{[\s\S]*display:\s*flex/);
  assert.match(css, /\.pr-row__label\s*\{[^}]*min-width:\s*0/);
  assert.match(css, /\.pr-row__value\s*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.doesNotMatch(css, /\.pr-row__label\s*\{[^}]*text-overflow:\s*ellipsis/);
});
