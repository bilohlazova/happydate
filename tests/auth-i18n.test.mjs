import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createTranslator } from "next-intl";

import { mapAuthError } from "../src/lib/auth/mapAuthError.ts";

const root = process.cwd();
const locales = ["pl", "uk", "en", "ru", "de"];

async function authMessages(locale) {
  return JSON.parse(await readFile(path.join(root, "messages", locale, "auth.json"), "utf8"));
}

async function translate(locale) {
  return createTranslator({ locale, messages: { auth: await authMessages(locale) } });
}

const expected = {
  pl: ["Zaloguj się", "Załóż konto", "Reset hasła", "Ustaw nowe hasło"],
  uk: ["Увійти", "Створити обліковий запис", "Скидання пароля", "Встановити новий пароль"],
  en: ["Log in", "Create an account", "Reset password", "Set a new password"],
  ru: ["Войти", "Создать аккаунт", "Сброс пароля", "Установить новый пароль"],
  de: ["Anmelden", "Konto erstellen", "Passwort zurücksetzen", "Neues Passwort festlegen"],
};

for (const locale of locales) {
  test(`${locale} Auth titles are localized`, async () => {
    const t = await translate(locale);
    assert.deepEqual([
      t("auth.login.title"), t("auth.register.title"), t("auth.reset.title"),
      t("auth.updatePassword.title"),
    ], expected[locale]);
  });
}

test("password visibility labels exist in all locales", async () => {
  for (const locale of locales) {
    const t = await translate(locale);
    assert.notEqual(t("auth.common.showPassword").trim(), "");
    assert.notEqual(t("auth.common.hidePassword").trim(), "");
  }
});

test("validation and accessibility keys have exact parity", async () => {
  const polish = await authMessages("pl");
  for (const locale of locales) {
    const messages = await authMessages(locale);
    assert.deepEqual(Object.keys(messages.validation).sort(), Object.keys(polish.validation).sort());
    assert.deepEqual(Object.keys(messages.accessibility).sort(), Object.keys(polish.accessibility).sort());
  }
});

test("safe mapper covers known authentication errors", () => {
  assert.equal(mapAuthError({ message: "Invalid login credentials" }), "invalidCredentials");
  assert.equal(mapAuthError({ message: "User already registered" }), "emailAlreadyRegistered");
  assert.equal(mapAuthError({ message: "Email not confirmed" }), "emailNotConfirmed");
  assert.equal(mapAuthError({ status: 429, message: "backend details" }), "rateLimited");
  assert.equal(mapAuthError({ message: "OTP expired" }), "expiredLink");
  assert.equal(mapAuthError({ status: 401 }), "unauthorized");
  assert.equal(mapAuthError(new TypeError("Failed to fetch")), "network");
});

test("unknown errors map to generic without returning raw text", () => {
  const raw = "Database host internals should never appear";
  const result = mapAuthError({ message: raw });
  assert.equal(result, "generic");
  assert.notEqual(result, raw);
});

test("Auth routes and redirects remain unchanged and unprefixed", async () => {
  const files = [
    "src/app/auth/login/LoginPageContent.tsx",
    "src/app/auth/register/RegisterPageContent.tsx",
    "src/app/auth/reset/page.tsx",
    "src/app/auth/callback/page.tsx",
    "src/app/auth/update-password/page.tsx",
  ];
  const sources = await Promise.all(files.map((file) => readFile(path.join(root, file), "utf8")));
  const combined = sources.join("\n");
  for (const route of ["/auth/login", "/auth/register", "/auth/reset", "/auth/callback", "/auth/update-password", "/profile", "/survey", "/dashboard"]) {
    assert.match(combined, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.doesNotMatch(combined, /\/(pl|uk|en|ru|de)\/auth/);
});

test("registration has no invented or changed legal links", async () => {
  const source = await readFile(path.join(root, "src/app/auth/register/RegisterPageContent.tsx"), "utf8");
  assert.doesNotMatch(source, /href="\/(terms|privacy|regulamin)/);
  assert.match(source, /href="\/auth\/login"/);
});

test("user email, name, and password values remain untranslated", async () => {
  const [login, register] = await Promise.all([
    readFile(path.join(root, "src/app/auth/login/LoginPageContent.tsx"), "utf8"),
    readFile(path.join(root, "src/app/auth/register/RegisterPageContent.tsx"), "utf8"),
  ]);
  assert.match(login, /value=\{email\}/);
  assert.match(login, /value=\{password\}/);
  assert.match(register, /value=\{fullName\}/);
  assert.match(register, /data: \{ full_name: fullName \}/);
});

test("Auth pages never render raw Supabase errors", async () => {
  const files = [
    "src/app/auth/login/LoginPageContent.tsx", "src/app/auth/register/RegisterPageContent.tsx",
    "src/app/auth/reset/page.tsx", "src/app/auth/update-password/page.tsx",
  ];
  for (const file of files) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.doesNotMatch(source, /set(ErrorMsg|Err)\(error\.message\)/);
    assert.match(source, /mapAuthError\(error\)/);
  }
});

test("callback loading state is localized", async () => {
  for (const locale of locales) {
    assert.notEqual((await translate(locale))("auth.callback.loading").trim(), "");
  }
  const source = await readFile(path.join(root, "src/app/auth/callback/page.tsx"), "utf8");
  assert.match(source, /translate\("loading"\)/);
  assert.match(source, /role="status"/);
});

test("Auth dictionaries have no empty values or accidental Polish copies", async () => {
  const flatten = (value, prefix = "", result = {}) => {
    for (const [key, child] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${key}` : key;
      if (child && typeof child === "object") flatten(child, next, result);
      else result[next] = child;
    }
    return result;
  };
  const polish = flatten(await authMessages("pl"));
  const allowed = new Set(["register.namePlaceholder"]);
  for (const locale of ["uk", "en", "ru", "de"]) {
    const values = flatten(await authMessages(locale));
    assert.deepEqual(Object.keys(values).sort(), Object.keys(polish).sort());
    for (const [key, value] of Object.entries(values)) {
      assert.equal(typeof value, "string");
      assert.notEqual(value.trim(), "");
      if (!allowed.has(key)) assert.notEqual(value, polish[key], `${locale}:${key} copied Polish`);
    }
  }
});

test("German Auth copy uses fluid containers and non-truncated controls", async () => {
  const messages = await authMessages("de");
  assert.ok(messages.reset.submit.length > 20);
  const files = [
    "src/app/auth/login/LoginPageContent.tsx", "src/app/auth/register/RegisterPageContent.tsx",
    "src/app/auth/reset/page.tsx", "src/app/auth/update-password/page.tsx",
  ];
  for (const file of files) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.match(source, /w-full/);
    assert.doesNotMatch(source, /truncate|text-ellipsis|whitespace-nowrap/);
  }
});
