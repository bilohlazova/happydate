import assert from "node:assert/strict";
import test from "node:test";
import { calendarReminderStart } from "../src/lib/reminders/calendarReminderTiming.ts";

test("far Calendar events start preparation thirty calendar days before", () => {
  assert.equal(
    calendarReminderStart("2026-10-31", new Date("2026-08-06T10:00:00.000Z")),
    new Date("2026-10-01T09:00:00").toISOString(),
  );
});

test("near Calendar events start reminding immediately", () => {
  const now = new Date("2026-08-06T10:00:00.000Z");
  assert.equal(calendarReminderStart("2026-08-20", now), now.toISOString());
});

test("past and malformed Calendar dates never create a reminder", () => {
  const now = new Date("2026-08-06T10:00:00.000Z");
  assert.equal(calendarReminderStart("2026-08-05", now), null);
  assert.equal(calendarReminderStart("not-a-date", now), null);
});
