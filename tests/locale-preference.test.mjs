import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { changeApplicationLocale } from "../src/i18n/changeApplicationLocale.ts";
import { buildLocaleCookie, clearLocaleChoice, getLocaleCookie, getLocaleMeta, getStoredLocale, markLocaleSynced, setLocaleCookie } from "../src/i18n/localeCookie.ts";
import { LANGUAGE_OPTIONS } from "../src/i18n/localeOptions.ts";
import { resolveAuthenticatedLocale, resolveLoginLocaleAction } from "../src/i18n/profileLocaleSync.ts";
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

test("English is the final authenticated fallback", () => {
  assert.equal(resolveAuthenticatedLocale(null, null, null), "en");
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
  assert.match(source, /resolveLoginLocaleAction/);
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

test("setLocaleCookie mirrors the manual choice to storage for webviews", () => {
  const store = new Map();
  globalThis.document = { cookie: "" };
  globalThis.window = { localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } };
  try {
    setLocaleCookie("ru");
    assert.equal(getStoredLocale(), "ru");
    store.set("happydate_locale", "fr");
    assert.equal(getStoredLocale(), null);
  } finally {
    delete globalThis.document;
    delete globalThis.window;
  }
});

test("first launch uses the device language and falls back to English", async () => {
  const { resolveRequestLocale } = await import("../src/i18n/config.ts");
  assert.equal(resolveRequestLocale(undefined, "de-DE,de;q=0.9"), "de");
  assert.equal(resolveRequestLocale(undefined, "fr-FR,fr;q=0.9"), "en");
  assert.equal(resolveRequestLocale("pl", "de-DE"), "pl");
});

function installStorage() {
  const store = new Map();
  globalThis.document = { cookie: "" };
  globalThis.window = { localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) } };
  return store;
}
function uninstallStorage() { delete globalThis.document; delete globalThis.window; }

test("iOS Info.plist declares exactly the supported localizations", async () => {
  const plist = await readFile(path.join(root, "ios/App/App/Info.plist"), "utf8");
  const block = plist.match(/<key>CFBundleLocalizations<\/key>\s*<array>([\s\S]*?)<\/array>/);
  assert.ok(block, "CFBundleLocalizations missing");
  const declared = [...block[1].matchAll(/<string>([^<]+)<\/string>/g)].map((m) => m[1]).sort();
  assert.deepEqual(declared, ["de", "en", "pl", "ru", "uk"]);
  assert.match(plist, /<key>CFBundleDevelopmentRegion<\/key>\s*<string>en<\/string>/);
});

test("failed profile save keeps the choice pending and never reports sync", async () => {
  const store = installStorage();
  try {
    const calls = [];
    const result = await changeApplicationLocale("de", {
      isAuthenticated: true,
      setCookie: (l) => setLocaleCookie(l, "user-a", true),
      updateProfile: async () => { throw new Error("supabase down"); },
      refresh: () => calls.push("refresh"),
      markSynced: () => markLocaleSynced("user-a"),
    });
    assert.equal(result.profileSyncFailed, true);
    assert.deepEqual(getLocaleMeta(), { ownerId: "user-a", pending: true });
    assert.equal(getStoredLocale(), "de");
    assert.deepEqual(calls, ["refresh"]);
  } finally { uninstallStorage(); }
});

test("confirmed profile save clears the pending state", async () => {
  installStorage();
  try {
    await changeApplicationLocale("uk", {
      isAuthenticated: true,
      setCookie: (l) => setLocaleCookie(l, "user-a", true),
      updateProfile: async () => undefined,
      refresh: () => undefined,
      markSynced: () => markLocaleSynced("user-a"),
    });
    assert.deepEqual(getLocaleMeta(), { ownerId: "user-a", pending: false });
  } finally { uninstallStorage(); }
});

test("pending choice is retried and wins over a stale profile after reload", () => {
  const meta = { ownerId: "user-a", pending: true };
  assert.deepEqual(resolveLoginLocaleAction("user-a", "pl", "de", meta), { type: "pushToProfile", locale: "de" });
  assert.deepEqual(resolveLoginLocaleAction("user-a", null, "de", meta), { type: "pushToProfile", locale: "de" });
});

test("confirmed owned choice follows the profile and does not loop", () => {
  const meta = { ownerId: "user-a", pending: false };
  assert.deepEqual(resolveLoginLocaleAction("user-a", "de", "de", meta), { type: "none" });
  assert.deepEqual(resolveLoginLocaleAction("user-a", "uk", "de", meta), { type: "applyProfile", locale: "uk" });
  assert.deepEqual(resolveLoginLocaleAction("user-a", null, "de", meta), { type: "pushToProfile", locale: "de" });
});

test("account switch: another user's choice is never copied into this profile", () => {
  const metaOfA = { ownerId: "user-a", pending: true };
  assert.deepEqual(resolveLoginLocaleAction("user-b", "uk", "de", metaOfA), { type: "applyProfile", locale: "uk" });
  assert.deepEqual(resolveLoginLocaleAction("user-b", null, "de", metaOfA), { type: "discardCookie" });
  assert.deepEqual(resolveLoginLocaleAction("user-b", null, "de", null), { type: "discardCookie" });
  assert.deepEqual(resolveLoginLocaleAction("user-b", "de", "de", metaOfA), { type: "claim" });
});

test("guest choice right before login fills an empty profile but not an existing one", () => {
  const guest = { ownerId: null, pending: false };
  assert.deepEqual(resolveLoginLocaleAction("user-a", null, "ru", guest), { type: "pushToProfile", locale: "ru" });
  assert.deepEqual(resolveLoginLocaleAction("user-a", "uk", "ru", guest), { type: "applyProfile", locale: "uk" });
  assert.deepEqual(resolveLoginLocaleAction("user-a", "ru", "ru", guest), { type: "claim" });
});

test("no cookie: profile applies, otherwise device language is left alone", () => {
  assert.deepEqual(resolveLoginLocaleAction("user-a", "de", null, null), { type: "applyProfile", locale: "de" });
  assert.deepEqual(resolveLoginLocaleAction("user-a", null, null, null), { type: "none" });
});

test("choice and owner survive reload via storage and can be cleared", () => {
  const store = installStorage();
  try {
    setLocaleCookie("de", "user-a", false);
    assert.deepEqual(getLocaleMeta(), { ownerId: "user-a", pending: false });
    store.set("happydate_locale_meta", "{broken");
    assert.equal(getLocaleMeta(), null);
    clearLocaleChoice();
    assert.equal(getStoredLocale(), null);
    assert.match(document.cookie, /Max-Age=0/);
  } finally { uninstallStorage(); }
});

test("profile write is confirmed by a returned row, not only by absence of error", async () => {
  const source = await readFile(path.join(root, "src/lib/repositories/profile/profileLocale.repository.ts"), "utf8");
  assert.match(source, /\.select\("id"\)/);
  assert.match(source, /!updated\?\.length/);
});

test("Header retries failed sync only on next load and keeps the restored owner", async () => {
  const source = await readFile(path.join(root, "src/components/Header.tsx"), "utf8");
  assert.match(source, /failed:\$\{user\.id\}/);
  assert.match(source, /meta\?\.ownerId \?\? null, meta\?\.pending \?\? false/);
  assert.match(source, /setLocaleCookie\(action\.locale, user\.id, true\)/);
});
