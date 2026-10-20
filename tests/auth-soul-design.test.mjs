import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("login and registration share the HappyDate auth shell", async () => {
  const login = await readFile(new URL("../src/app/auth/login/LoginPageContent.tsx", import.meta.url), "utf8");
  const register = await readFile(new URL("../src/app/auth/register/RegisterPageContent.tsx", import.meta.url), "utf8");

  for (const page of [login, register]) {
    assert.match(page, /auth-care-page/);
    assert.match(page, /auth-care-submit/);
  }
  assert.match(login, /auth-care-brand/);
  assert.match(login, /auth-care-promise/);
  assert.match(login, /login\.promise/);
  assert.doesNotMatch(register, /auth-care-brand/);
  assert.doesNotMatch(register, /auth-care-promise/);
  assert.match(register, /AuthLegalLinks consent/);
});
