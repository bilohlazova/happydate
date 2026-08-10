import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Care separates available human support from future Premium", async () => {
  const page = await readFile(new URL("../src/app/care/page.tsx", import.meta.url), "utf8");

  assert.match(page, /availableNow/);
  assert.match(page, /href="mailto:hello@happydate\.pl"/);
  assert.match(page, /<ComingSoonNotice/);
  assert.match(page, /future\.badge/);
  assert.match(page, /future\.title/);
  assert.match(page, /future\.description/);
});
