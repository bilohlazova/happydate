import assert from "node:assert/strict";
import test from "node:test";
import {
  expandCalendarEventOccurrences,
  nextCalendarEventOccurrence,
  occurrenceDatesBetween,
} from "../src/lib/events/eventRecurrence.ts";

test("weekly recurrence is anchored and bounded by the requested range", () => {
  assert.deepEqual(
    occurrenceDatesBetween("2026-08-03", "weekly", "2026-08-01", "2026-08-31"),
    ["2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31"],
  );
});

test("monthly recurrence clamps to month end without date drift", () => {
  assert.deepEqual(
    occurrenceDatesBetween("2026-01-31", "monthly", "2026-01-01", "2026-04-30"),
    ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"],
  );
});

test("yearly leap-day recurrence uses the last valid day", () => {
  assert.deepEqual(
    occurrenceDatesBetween("2024-02-29", "yearly", "2025-01-01", "2028-12-31"),
    ["2025-02-28", "2026-02-28", "2027-02-28", "2028-02-29"],
  );
});

test("birthday rows are never expanded as independent recurring series", () => {
  const event = {
    id: "birthday-row",
    title: "Birthday: Dima",
    date: "2026-08-03",
    notes: null,
    category: "birthday",
    personId: "dima",
    personName: "Dima",
    isImportant: true,
    recurrenceRule: "yearly",
  };
  assert.deepEqual(
    expandCalendarEventOccurrences([event], "2026-01-01", "2028-12-31").map(({ id, date }) => ({ id, date })),
    [{ id: "birthday-row", date: "2026-08-03" }],
  );
});

test("the next reminder occurrence is computed from today", () => {
  assert.equal(
    nextCalendarEventOccurrence("2025-08-10", "yearly", new Date("2026-08-06T10:00:00Z")),
    "2026-08-10",
  );
});
