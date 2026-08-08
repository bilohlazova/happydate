import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { addLocalDateOnlyDays, formatLocalDateOnly, parseLocalDateOnly } from "../src/lib/events/dateOnly.ts";

test("date-only values round-trip without UTC conversion", () => {
  const date = parseLocalDateOnly("2026-03-29");
  assert.ok(date);
  assert.equal(date.getHours(), 12);
  assert.equal(formatLocalDateOnly(date), "2026-03-29");
  assert.equal(addLocalDateOnlyDays("2026-03-29", 1), "2026-03-30");
  assert.equal(parseLocalDateOnly("2026-02-30"), null);
});

test("date-only arithmetic is stable in distant timezones and across DST", () => {
  const script = `
    import { addLocalDateOnlyDays, formatLocalDateOnly, parseLocalDateOnly } from ${JSON.stringify(new URL("../src/lib/events/dateOnly.ts", import.meta.url).href)};
    const values = [formatLocalDateOnly(parseLocalDateOnly("2026-03-29")), addLocalDateOnlyDays("2026-03-29", 1), addLocalDateOnlyDays("2026-11-01", 1)];
    process.stdout.write(JSON.stringify(values));
  `;
  for (const timezone of ["Pacific/Honolulu", "Europe/Warsaw", "Pacific/Kiritimati"]) {
    const result = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], {
      encoding: "utf8",
      env: { ...process.env, TZ: timezone },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), ["2026-03-29", "2026-03-30", "2026-11-02"]);
  }
});

test("Calendar exposes grid semantics, keyboard navigation, swipe navigation and an accessible day dialog", async () => {
  const page = await readFile(new URL("../src/app/(app)/dashboard/page.tsx", import.meta.url), "utf8");
  assert.match(page, /role="grid"/);
  assert.match(page, /role="gridcell"/);
  assert.match(page, /aria-current=\{isToday \? "date" : undefined\}/);
  assert.match(page, /ArrowLeft: -1[\s\S]*ArrowRight: 1[\s\S]*ArrowUp: -7[\s\S]*ArrowDown: 7/);
  assert.match(page, /onTouchStart[\s\S]*onTouchEnd[\s\S]*onNextMonth/);
  assert.match(page, /aria-labelledby="calendar-day-title"/);
  assert.match(page, /aria-label=\{t\("accessibility\.closeDay"\)\}/);
});
