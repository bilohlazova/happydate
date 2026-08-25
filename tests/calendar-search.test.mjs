import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeCalendarSearchText, searchCalendarEntries } from "../src/lib/events/calendarSearch.ts";

const entries = [
  { id: "1", kind: "event", title: "Spotkanie w Łodzi", date: "2026-09-02", searchText: "Anna biuro", payload: null },
  { id: "2", kind: "birthday", title: "Dmytro", date: "2026-08-28", searchText: "Urodziny prezent", payload: null },
  { id: "3", kind: "holiday", title: "Święto Niepodległości", date: "2026-11-11", searchText: "Polska", payload: null },
];

test("calendar search ignores case and diacritics and supports multiple tokens", () => {
  assert.equal(normalizeCalendarSearchText("  ŚWIĘTO—Łódź ", "pl"), "swieto łodz");
  assert.deepEqual(searchCalendarEntries(entries, "spotkanie anna", "pl", "2026-08-25").map((item) => item.id), ["1"]);
  assert.deepEqual(searchCalendarEntries(entries, "swieto", "pl", "2026-08-25").map((item) => item.id), ["3"]);
});

test("calendar search ranks title matches first and upcoming entries before past entries", () => {
  const ranked = searchCalendarEntries([
    ...entries,
    { id: "4", kind: "event", title: "Inne", date: "2026-08-20", searchText: "Dmytro", payload: null },
  ], "Dmytro", "uk", "2026-08-25");
  assert.deepEqual(ranked.map((item) => item.id), ["2", "4"]);
});

test("calendar search dialog is scoped to calendar records and remains keyboard accessible", async () => {
  const page = await readFile(new URL("../src/app/(app)/dashboard/page.tsx", import.meta.url), "utf8");
  assert.match(page, /searchCalendarEntries/);
  assert.match(page, /role="listbox"/);
  assert.match(page, /event\.key === "ArrowDown"/);
  assert.match(page, /event\.key === "Enter"/);
  assert.match(page, /observances=\{activeObservances\}/);
  assert.doesNotMatch(page, /Search events, people and notes/);
});
