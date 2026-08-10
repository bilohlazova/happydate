import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("password recovery and callback stay inside the trusted auth experience", async () => {
  for (const path of ["../src/app/auth/reset/page.tsx", "../src/app/auth/update-password/page.tsx", "../src/app/auth/callback/page.tsx"]) {
    const page = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(page, /auth-care-page/);
    assert.match(page, /auth-care-card/);
    assert.match(page, /auth-care-brand/);
  }
});
