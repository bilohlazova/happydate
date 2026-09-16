import assert from "node:assert/strict";
import test from "node:test";
import { isSameLocalCalendarDay } from "../src/lib/wellbeing/sameDay.ts";

test("same-day wellbeing check-in matches local calendar day", () => {
  const now = new Date("2026-09-16T12:00:00.000Z");
  assert.equal(isSameLocalCalendarDay("2026-09-16T11:55:00.000Z", now, "Europe/Warsaw"), true);
  assert.equal(isSameLocalCalendarDay("2026-09-15T11:55:00.000Z", now, "Europe/Warsaw"), false);
});

test("same-day calculation handles both sides of UTC midnight", () => {
  assert.equal(isSameLocalCalendarDay("2026-09-16T23:30:00.000Z", new Date("2026-09-17T00:15:00.000Z"), "Europe/Warsaw"), true);
  assert.equal(isSameLocalCalendarDay("2026-09-17T00:30:00.000Z", new Date("2026-09-16T23:45:00.000Z"), "America/Los_Angeles"), true);
});

test("invalid or missing timestamps fail safely", () => {
  assert.equal(isSameLocalCalendarDay(null, new Date("2026-09-16T12:00:00.000Z"), "UTC"), false);
  assert.equal(isSameLocalCalendarDay("not-a-date", new Date("2026-09-16T12:00:00.000Z"), "UTC"), false);
  assert.equal(isSameLocalCalendarDay("2026-09-16T12:00:00.000Z", new Date("invalid"), "UTC"), false);
});
