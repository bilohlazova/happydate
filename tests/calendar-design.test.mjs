import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Calendar exposes a responsive visual hierarchy, legend and important-day signal", async () => {
  const source = await readFile(new URL("../src/app/(app)/dashboard/page.tsx", import.meta.url), "utf8");
  assert.match(source, /hd-calendar-surface/);
  assert.match(source, /hd-calendar-legend/);
  assert.match(source, /hasImportantEvent/);
  assert.match(source, /aria-label=\{t\("navigation\.today"\)\}/);
  assert.match(source, /function EventCategoryIcon/);
  assert.doesNotMatch(source, /CAT_EMOJI/);
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)/);
});
