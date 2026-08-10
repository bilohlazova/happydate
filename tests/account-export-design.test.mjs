import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("account export explains ownership, exact scope, format and file safety", async () => {
  const page = await readFile(new URL("../src/app/(app)/settings/export/page.tsx", import.meta.url), "utf8");

  assert.match(page, /export-trust-hero/);
  assert.match(page, /ownershipTitle/);
  assert.match(page, /formatTitle/);
  assert.match(page, /safetyTitle/);
  assert.match(page, /aria-busy=\{status === "preparing"\}/);
});
