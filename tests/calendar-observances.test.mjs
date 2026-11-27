import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { GET } from "../src/app/api/calendar/observances/route.ts";
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

test("patched provider preserves every supported country across all five locales", async () => {
  const baseline = JSON.parse(readFileSync(new URL("./fixtures/calendar-provider-before-deepmerge-patch.json", import.meta.url), "utf8"));
  assert.deepEqual(Object.keys(new Holidays().getCountries("en")).sort(), baseline.countries);
  let checked = 0;
  for (const country of baseline.countries) {
    for (const locale of baseline.locales) {
      const response = await GET(new Request(`https://calendar.example/api/calendar/observances?year=${baseline.year}&country=${country}&locale=${locale}`));
      assert.equal(response.status, 200, `${country}/${locale}`);
      assert.equal(response.headers.get("cache-control"), "public, max-age=86400, stale-while-revalidate=604800");
      const body = await response.json();
      assert.equal(body.country, country);
      assert.equal(body.year, baseline.year);
      assert.deepEqual(Object.keys(body.countries).sort(), baseline.countries);
      assert.equal(createHash("sha256").update(JSON.stringify(body.observances)).digest("hex"), baseline.hashes[`${country}/${locale}`], `${country}/${locale}`);
      assert.equal(new Set(body.observances.map(item => item.date)).size, body.observances.length);
      checked++;
    }
  }
  assert.equal(checked, 1030);
});
test("calendar query input cannot select inherited keys or inject merge objects", async () => {
  for (const locale of ["__proto__", "constructor", "hasOwnProperty", "toString", '{"__proto__":{"isAdmin":true}}', "unsupported"]) {
    const query = new URLSearchParams({ year: "2026", locale, country: "__proto__" });
    const response = await GET(new Request(`https://calendar.example/api/calendar/observances?${query}`));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.country, "GB");
    assert.equal(Object.hasOwn(body, "isAdmin"), false);
    assert.equal(Object.prototype.isAdmin, undefined);
  }
  for (const year of ["", "1969", "2101", "2026.5", "NaN", "Infinity", '{"__proto__":{"isAdmin":true}}']) {
    const response = await GET(new Request(`https://calendar.example/api/calendar/observances?year=${encodeURIComponent(year)}`));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid calendar year." });
  }
});
test("default countries, language tags and boundary years remain supported", async () => {
  for (const [locale, country] of Object.entries({ uk: "UA", pl: "PL", de: "DE", en: "GB", ru: "RU" })) {
    for (const year of [1970, 2100]) {
      const response = await GET(new Request(`https://calendar.example/api/calendar/observances?year=${year}&locale=${locale}-XX`));
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.country, country);
      assert.equal(body.year, year);
      assert.ok(body.observances.length > 0);
    }
  }
});
