import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("new and reset passwords match the production eight-character policy", async () => {
  const [register, update] = await Promise.all([
    readFile(new URL("../src/app/auth/register/RegisterPageContent.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/auth/update-password/page.tsx", import.meta.url), "utf8"),
  ]);
  for (const source of [register, update]) {
    assert.match(source, /password\.length < 8/);
    assert.match(source, /minLength=\{8\}/);
    assert.doesNotMatch(source, /password\.length < 6|minLength=\{6\}/);
  }
});

test("login does not reject legacy passwords using the new-account policy", async () => {
  const login = await readFile(
    new URL("../src/app/auth/login/LoginPageContent.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(login, /password\.length <|minLength=/);
  assert.match(login, /signInWithPassword/);
});

test("all locales explain the eight-character new-password minimum", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const messages = JSON.parse(
      await readFile(new URL(`../messages/${locale}/auth.json`, import.meta.url), "utf8"),
    );
    assert.match(messages.register.passwordPlaceholder, /8/);
    assert.match(messages.validation.passwordTooShort, /8/);
  }
});
