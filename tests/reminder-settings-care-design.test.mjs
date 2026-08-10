import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("reminder settings explain care boundaries and keep one delivery channel", async () => {
  const page = await readFile(new URL("../src/app/(app)/settings/reminders/page.tsx", import.meta.url), "utf8");

  assert.match(page, /reminder-care-promise/);
  assert.match(page, /timingTitle/);
  assert.match(page, /deliveryTitle/);
  assert.match(page, /channelRequired/);
  assert.match(page, /disabled=\{!value\.pushEnabled\}/);
  assert.match(page, /disabled=\{!value\.inAppEnabled\}/);
});
