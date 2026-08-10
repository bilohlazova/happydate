import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("login and registration share one trustworthy HappyDate entrance", async () => {
  const login = await readFile(new URL("../src/app/auth/login/LoginPageContent.tsx", import.meta.url), "utf8");
  const register = await readFile(new URL("../src/app/auth/register/RegisterPageContent.tsx", import.meta.url), "utf8");

  for (const page of [login, register]) {
    assert.match(page, /auth-care-page/);
    assert.match(page, /auth-care-brand/);
    assert.match(page, /auth-care-promise/);
    assert.match(page, /auth-care-submit/);
  }
  assert.match(login, /login\.promise/);
  assert.match(register, /register\.promise/);
});
