import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("calendar event sheet exposes an accessible focused hierarchy", async () => {
  const source = await readFile(new URL("../src/app/(app)/dashboard/page.tsx", import.meta.url), "utf8");
  assert.match(source, /aria-labelledby=\{`\$\{mode\}-event-sheet-title`\}/);
  assert.match(source, /className="calendar-event-sheet/);
  assert.match(source, /className="calendar-event-fields/);
  assert.match(source, /aria-pressed=\{category === c\.value\}/);
  assert.match(source, /calendar-event-reminder--active/);
});
