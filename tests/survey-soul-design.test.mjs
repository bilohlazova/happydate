import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("survey feels like a private first conversation with Happy", async () => {
  const page = await readFile(new URL("../src/app/survey/page.tsx", import.meta.url), "utf8");

  assert.match(page, /survey-care-hero/);
  assert.match(page, /privacyTitle/);
  assert.match(page, /privacyBody/);
  assert.match(page, /survey-care-question/);
  assert.match(page, /survey-care-submit/);
});
