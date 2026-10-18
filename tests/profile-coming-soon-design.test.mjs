import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("profile ends with stats while settings owns account controls", async () => {
  const page = await readFile(new URL("../src/app/(app)/profile/page.tsx", import.meta.url), "utf8");
  const settings = await readFile(new URL("../src/app/(app)/settings/page.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(page, /<ComingSoonNotice/);
  assert.match(page, /copy\.socialTitle/);
  const dictionary = await readFile(new URL("../src/i18n/profileUi.ts", import.meta.url), "utf8");
  assert.match(dictionary, /На одній хвилі/);
  assert.doesNotMatch(page, /href: "\/settings\/(notifications|ai|delete|password)"/);
  assert.doesNotMatch(page, /href="\/settings\//);
  assert.match(settings, /href="\/settings\/reminders"/);
  assert.match(settings, /href="\/settings\/sessions"/);
  assert.match(settings, /href="\/auth\/reset"/);
  assert.match(settings, /href="\/settings\/export"/);
});
