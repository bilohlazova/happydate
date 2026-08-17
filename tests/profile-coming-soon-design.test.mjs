import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("profile distinguishes working settings from future capabilities", async () => {
  const page = await readFile(new URL("../src/app/(app)/profile/page.tsx", import.meta.url), "utf8");

  assert.match(page, /<ComingSoonNotice/);
  assert.match(page, /statusTitle/);
  assert.match(page, /comingSoon: true/);
  assert.match(page, /aria-disabled="true"/);
  assert.doesNotMatch(page, /href: "\/settings\/(notifications|ai|delete|password)"/);
  assert.match(page, /href: "\/settings\/reminders"/);
  assert.match(page, /href: "\/settings\/sessions"/);
  assert.match(page, /href: "\/auth\/reset"/);
  assert.match(page, /href: "\/settings\/export"/);
});
