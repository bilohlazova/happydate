import assert from "node:assert/strict";
import test from "node:test";
import Holidays from "date-holidays";
import { buildCalendarObservances, isReligiousHoliday, orthodoxEasterDate } from "../src/lib/events/holidayObservances.ts";

test("holiday catalog removes substitute and unmarked adjacent duplicates", () => {
  const result = buildCalendarObservances([
    { date: "2026-03-08 00:00:00", name: "Міжнародний жіночий день", type: "public", rule: "03-08 and if sunday then next monday" },
    { date: "2026-03-09 00:00:00", name: "Міжнародний жіночий день", type: "public", rule: "03-08 and if sunday then next monday" },
    { date: "2026-04-12 00:00:00", name: "Великдень", type: "public", rule: "orthodox" },
    { date: "2026-04-13 00:00:00", name: "Великдень (замінити день)", type: "public", rule: "orthodox", substitute: true },
  ], "UA", 2026, "uk");

  assert.equal(result.filter((item) => item.title === "Міжнародний жіночий день").length, 1);
  assert.equal(result.filter((item) => item.title === "Великдень").length, 1);
  assert.equal(new Set(result.map((item) => item.date)).size, result.length);
});

test("religious holidays keep a dedicated semantic kind even when legally public", () => {
  assert.equal(isReligiousHoliday({ name: "Різдво Христове", rule: "12-25" }), true);
  assert.equal(isReligiousHoliday({ name: "Easter Sunday", rule: "easter" }), true);
  assert.equal(isReligiousHoliday({ name: "Mother's Day", rule: "easter -21" }), false);

  const [christmas] = buildCalendarObservances([
    { date: "2026-12-25 00:00:00", name: "Різдво Христове", type: "public", rule: "12-25" },
  ], "UA", 2026, "uk").filter((item) => item.date === "2026-12-25");
  assert.equal(christmas.kind, "religious");
});

test("Eastern Christian calendar adds core movable and fixed observances", () => {
  assert.equal(orthodoxEasterDate(2026), "2026-04-12");
  const result = buildCalendarObservances([], "UA", 2026, "uk");
  assert.deepEqual(
    result.filter((item) => item.kind === "religious").map((item) => item.date),
    ["2026-01-06", "2026-03-25", "2026-04-05", "2026-04-12", "2026-05-21", "2026-05-31", "2026-08-06", "2026-08-15"],
  );
});

test("real Ukrainian holiday source has unique dates and a complete religious layer", () => {
  const holidays = new Holidays("UA");
  holidays.setLanguages(["uk", "en"]);
  const result = buildCalendarObservances(holidays.getHolidays(2026), "UA", 2026, "uk");
  assert.equal(new Set(result.map((item) => item.date)).size, result.length);
  assert.equal(result.filter((item) => item.title === "Новий Рік").length, 1);
  assert.equal(result.filter((item) => item.title === "Міжнародний жіночий день").length, 1);
  assert.ok(result.filter((item) => item.kind === "religious").length >= 9);
  assert.ok(result.some((item) => item.title === "Вербна неділя"));
  assert.ok(result.some((item) => item.title === "Різдво Христове" && item.kind === "religious"));
});
