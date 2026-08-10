import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("calendar explains its care purpose before the month grid", async () => {
  const page = await readFile(new URL("../src/app/(app)/dashboard/page.tsx", import.meta.url), "utf8");

  assert.match(page, /hd-calendar-purpose/);
  assert.match(page, /purpose\.title/);
  assert.match(page, /purpose\.description/);
  assert.ok(page.indexOf("hd-calendar-purpose\"") < page.indexOf("hd-calendar-surface\""));
});
