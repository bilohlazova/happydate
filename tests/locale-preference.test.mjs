import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { changeApplicationLocale } from "../src/i18n/changeApplicationLocale.ts";
import { buildLocaleCookie, getLocaleCookie } from "../src/i18n/localeCookie.ts";
import { LANGUAGE_OPTIONS } from "../src/i18n/localeOptions.ts";
import { resolveAuthenticatedLocale, shouldSynchronizeProfileLocale } from "../src/i18n/profileLocaleSync.ts";
import { buildPreferredLocaleUpdate, parsePreferredLocale } from "../src/lib/repositories/profile/profile.types.ts";

const root = process.cwd();

test("valid profile locale wins over cookie", () => {
  assert.equal(resolveAuthenticatedLocale("de", "uk", "en"), "de");
});

test("cookie wins when profile locale is null", () => {
  assert.equal(resolveAuthenticatedLocale(null, "uk", "de"), "uk");
});

test("browser wins when profile and cookie are absent", () => {
  assert.equal(resolveAuthenticatedLocale(null, null, "ru"), "ru");
});

test("Polish is the final authenticated fallback", () => {
  assert.equal(resolveAuthenticatedLocale(null, null, null), "pl");
});

test("invalid profile locale is ignored", () => {
  assert.equal(parsePreferredLocale("fr"), null);
  assert.equal(parsePreferredLocale({ locale: "de" }), null);
});

test("cookie parsing is exact and ignores invalid values", () => {
  assert.equal(getLocaleCookie("other=de; happydate_locale=uk; x=1"), "uk");
  assert.equal(getLocaleCookie("happydate_locale_extra=de"), null);
  assert.equal(getLocaleCookie("happydate_locale=fr"), null);
});

test("locale cookie has required durable settings", () => {
  const cookie = buildLocaleCookie("de", true);
  assert.match(cookie, /^happydate_locale=de;/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /Max-Age=31536000/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
  assert.doesNotMatch(buildLocaleCookie("de", false), /Secure/);
});

test("explicit guest selection writes cookie, refreshes, and skips profile", async () => {
  const calls = [];
  const result = await changeApplicationLocale("uk", {
    isAuthenticated: false,
    setCookie: (locale) => calls.push(["cookie", locale]),
    updateProfile: async (locale) => calls.push(["profile", locale]),
    refresh: () => calls.push(["refresh"]),
  });
  assert.deepEqual(calls, [["cookie", "uk"], ["refresh"]]);
  assert.equal(result.profileSyncFailed, false);
});

test("authenticated selection updates only after writing cookie", async () => {
  const calls = [];
  await changeApplicationLocale("en", {
    isAuthenticated: true,
    setCookie: (locale) => calls.push(["cookie", locale]),
    updateProfile: async (locale) => calls.push(["profile", locale]),
    refresh: () => calls.push(["refresh"]),
  });
  assert.deepEqual(calls, [["cookie", "en"], ["profile", "en"], ["refresh"]]);
});

test("profile-sync failure keeps cookie selection and refreshes", async () => {
  const calls = [];
  const result = await changeApplicationLocale("ru", {
    isAuthenticated: true,
    setCookie: (locale) => calls.push(["cookie", locale]),
    updateProfile: async () => { throw new Error("raw database detail"); },
    refresh: () => calls.push(["refresh"]),
  });
  assert.deepEqual(calls, [["cookie", "ru"], ["refresh"]]);
  assert.equal(result.profileSyncFailed, true);
});

test("login synchronization only runs for a differing non-null profile locale", () => {
  assert.equal(shouldSynchronizeProfileLocale("de", "pl"), true);
  assert.equal(shouldSynchronizeProfileLocale("de", "de"), false);
  assert.equal(shouldSynchronizeProfileLocale(null, "uk"), false);
});

test("profile update payload contains only preferred_locale", () => {
  assert.deepEqual(buildPreferredLocaleUpdate("en"), { preferred_locale: "en" });
});

test("unsupported locale cannot be written", () => {
  assert.throws(() => buildPreferredLocaleUpdate("fr"), TypeError);
  assert.throws(() => buildLocaleCookie("fr", false), TypeError);
});

test("all language options use native names and codes", () => {
  assert.deepEqual(LANGUAGE_OPTIONS.map(({ code, nativeName }) => [code, nativeName]), [
    ["PL", "Polski"], ["UK", "Українська"], ["EN", "English"],
    ["RU", "Русский"], ["DE", "Deutsch"],
  ]);
});

test("switcher implements active, keyboard, outside-click, and pending semantics", async () => {
  const source = await readFile(path.join(root, "src/components/i18n/LanguageSwitcher.tsx"), "utf8");
  assert.match(source, /role="menuitemradio"/);
  assert.match(source, /aria-checked=\{active\}/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /pointerdown/);
  assert.match(source, /triggerRef\.current\?\.focus\(\)/);
  assert.match(source, /disabled=\{pendingLocale !== null\}/);
});

test("switcher refreshes current route without locale-prefix navigation", async () => {
  const source = await readFile(path.join(root, "src/components/i18n/LanguageSwitcher.tsx"), "utf8");
  assert.match(source, /refresh: router\.refresh/);
  assert.doesNotMatch(source, /router\.(push|replace)/);
  assert.doesNotMatch(source, /\/(pl|uk|en|ru|de)\//);
});

test("Header uses one profile read and an explicit refresh-loop guard", async () => {
  const source = await readFile(path.join(root, "src/components/Header.tsx"), "utf8");
  assert.match(source, /getPreferredLocaleForUser\(user\.id\)/);
  assert.match(source, /synchronizedProfileRef/);
  assert.match(source, /shouldSynchronizeProfileLocale/);
});

test("logout paths do not delete or reset the locale cookie", async () => {
  const sources = await Promise.all([
    readFile(path.join(root, "src/components/Header.tsx"), "utf8"),
    readFile(path.join(root, "src/app/(app)/profile/page.tsx"), "utf8"),
  ]);
  for (const source of sources) {
    assert.doesNotMatch(source, /deleteLocaleCookie/);
    assert.doesNotMatch(source, /setLocaleCookie\("pl"\)/);
  }
});

test("repository update is narrow and never exposes raw errors", async () => {
  const source = await readFile(path.join(root, "src/lib/repositories/profile/profileLocale.repository.ts"), "utf8");
  assert.match(source, /\.update\(payload\)/);
  assert.doesNotMatch(source, /full_name|phone|avatar_url|preferences|points/);
  assert.doesNotMatch(source, /error\.message/);
});

test("German compact trigger and Header breakpoints are protected", async () => {
  const [css, header] = await Promise.all([
    readFile(path.join(root, "src/app/globals.css"), "utf8"),
    readFile(path.join(root, "src/components/Header.tsx"), "utf8"),
  ]);
  assert.match(css, /language-switcher__trigger[\s\S]*min-width: 62px/);
  assert.match(css, /@media \(max-width: 374px\)[\s\S]*min-width: 56px/);
  assert.match(header, /hd-mobile-menu-button/);
  assert.match(header, /<LanguageSwitcher isAuthenticated=\{isLoggedIn\}/);
});
