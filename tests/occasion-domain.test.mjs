import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { assistantLocalDate } from "../src/lib/assistant/assistantLocalDate.ts";
import { resolveOccasionDate, validateOccasionDateRule } from "../src/lib/occasions/occasionDate.ts";
import { OCCASION_REGISTRY, getOccasionDefinitionsForCountry, validateOccasionDefinition } from "../src/lib/occasions/occasionRegistry.ts";
import { getUserOccasionsForLocalDay, occasionOccurrenceKey, resolveNextOccasionOccurrence, resolveOccasionOccurrence, resolveOccasionPhase } from "../src/lib/occasions/occasionResolver.ts";

const boysDay = OCCASION_REGISTRY[0];

test("registry contains one validated PL Dzień Chłopaka definition", () => {
  assert.equal(OCCASION_REGISTRY.length, 1);
  assert.equal(boysDay.key, "pl_boys_day");
  assert.equal(boysDay.countryCode, "PL");
  assert.equal(boysDay.nameKey, "occasions.plBoysDay");
  assert.equal(validateOccasionDefinition(boysDay), true);
  assert.equal(new Set(OCCASION_REGISTRY.map((item) => item.key)).size, OCCASION_REGISTRY.length);
});

test("country lookup has no locale, timezone, or unsupported-country fallback", () => {
  assert.deepEqual(getOccasionDefinitionsForCountry("PL").map((item) => item.key), ["pl_boys_day"]);
  assert.deepEqual(getOccasionDefinitionsForCountry(null), []);
  assert.deepEqual(getOccasionDefinitionsForCountry("DE"), []);
  assert.deepEqual(getOccasionDefinitionsForCountry("pl"), []);
});

test("fixed September 30 resolves across years", () => {
  assert.equal(resolveOccasionDate({ rule: boysDay.dateRule, year: 2025 }), "2025-09-30");
  assert.equal(resolveOccasionDate({ rule: boysDay.dateRule, year: 2026 }), "2026-09-30");
  assert.equal(resolveOccasionDate({ rule: boysDay.dateRule, year: 2027 }), "2027-09-30");
  assert.equal(resolveOccasionDate({ rule: { kind: "fixed", month: 2, day: 29 }, year: 2025 }), null);
});

test("strict date-rule validation rejects malformed and unknown fields", () => {
  assert.equal(validateOccasionDateRule({ kind: "fixed", month: 0, day: 1 }), false);
  assert.equal(validateOccasionDateRule({ kind: "fixed", month: 1, day: 1, extra: true }), false);
  assert.equal(validateOccasionDateRule({ kind: "nth_weekday", month: 1, weekday: 0, ordinal: 1 }), false);
  assert.equal(validateOccasionDateRule({ kind: "nth_weekday", month: 1, weekday: 1, ordinal: 0 }), false);
  assert.equal(validateOccasionDateRule({ kind: "easter_relative", calendar: "orthodox", offsetDays: 0 }), false);
  assert.equal(validateOccasionDateRule({ kind: "easter_relative", calendar: "western", offsetDays: 1.5 }), false);
});

test("nth-weekday rules resolve first, second, last, and missing fifth occurrence", () => {
  assert.equal(resolveOccasionDate({ rule: { kind: "nth_weekday", month: 9, weekday: 2, ordinal: 1 }, year: 2026 }), "2026-09-01");
  assert.equal(resolveOccasionDate({ rule: { kind: "nth_weekday", month: 9, weekday: 2, ordinal: 2 }, year: 2026 }), "2026-09-08");
  assert.equal(resolveOccasionDate({ rule: { kind: "nth_weekday", month: 9, weekday: 2, ordinal: "last" }, year: 2026 }), "2026-09-29");
  assert.equal(resolveOccasionDate({ rule: { kind: "nth_weekday", month: 2, weekday: 7, ordinal: 5 }, year: 2026 }), null);
});

test("Western Easter-relative rules are deterministic and date-only", () => {
  const rule = (offsetDays) => ({ kind: "easter_relative", calendar: "western", offsetDays });
  assert.equal(resolveOccasionDate({ rule: rule(0), year: 2026 }), "2026-04-05");
  assert.equal(resolveOccasionDate({ rule: rule(3), year: 2026 }), "2026-04-08");
  assert.equal(resolveOccasionDate({ rule: rule(-2), year: 2026 }), "2026-04-03");
  assert.equal(resolveOccasionDate({ rule: rule(0), year: 2027 }), "2027-03-28");
});

test("phase windows are exactly planning, preparing, urgent, today", () => {
  assert.equal(resolveOccasionPhase(7), "planning");
  assert.equal(resolveOccasionPhase(4), "planning");
  assert.equal(resolveOccasionPhase(3), "preparing");
  assert.equal(resolveOccasionPhase(2), "preparing");
  assert.equal(resolveOccasionPhase(1), "urgent");
  assert.equal(resolveOccasionPhase(0), "today");
  assert.equal(resolveOccasionPhase(8), null);
  assert.equal(resolveOccasionPhase(-1), null);
});

test("Dzień Chłopaka occurrence resolves phase and stable keys", () => {
  const expected = [["2026-09-23", 7, "planning"], ["2026-09-26", 4, "planning"], ["2026-09-27", 3, "preparing"], ["2026-09-28", 2, "preparing"], ["2026-09-29", 1, "urgent"], ["2026-09-30", 0, "today"], ["2026-09-22", 8, null], ["2026-10-01", -1, null]];
  for (const [localDay, daysUntil, phase] of expected) {
    const result = resolveOccasionOccurrence({ definition: boysDay, year: 2026, localDay });
    assert.equal(result?.daysUntil, daysUntil);
    assert.equal(result?.phase, phase);
    assert.equal(result?.occurrenceKey, "occasion:pl_boys_day:2026");
  }
});

test("next occurrence crosses the year boundary without creating rows", () => {
  assert.equal(resolveNextOccasionOccurrence({ definition: boysDay, localDay: "2026-09-23" })?.localDate, "2026-09-30");
  assert.equal(resolveNextOccasionOccurrence({ definition: boysDay, localDay: "2026-10-01" })?.localDate, "2027-09-30");
  assert.equal(resolveNextOccasionOccurrence({ definition: { ...boysDay, dateRule: { kind: "fixed", month: 1, day: 15 } }, localDay: "2026-12-29" })?.occurrenceKey, "occasion:pl_boys_day:2027");
});

test("trusted timezone determines local day, never country", () => {
  const instant = new Date("2026-09-29T22:30:00.000Z");
  assert.equal(assistantLocalDate(instant, "Europe/Warsaw"), "2026-09-30");
  assert.equal(assistantLocalDate(instant, "UTC"), "2026-09-29");
  assert.equal(resolveNextOccasionOccurrence({ definition: boysDay, localDay: assistantLocalDate(instant, "Europe/Warsaw") })?.phase, "today");
  assert.equal(resolveNextOccasionOccurrence({ definition: boysDay, localDay: assistantLocalDate(instant, "UTC") })?.phase, "urgent");
});

test("definition and occurrence keys are stable and locale-independent", () => {
  assert.equal(boysDay.key, "pl_boys_day");
  assert.equal(occasionOccurrenceKey("pl_boys_day", 2026), "occasion:pl_boys_day:2026");
  assert.equal(occasionOccurrenceKey("pl_boys_day", 2027), "occasion:pl_boys_day:2027");
  assert.throws(() => occasionOccurrenceKey("Dzień Chłopaka", 2026), TypeError);
});

test("user occasion resolution reads explicit country and trusted reminder timezone only", async () => {
  const calls = [];
  const client = {
    from(table) {
      calls.push(table);
      const chain = {
        select() { return chain; },
        eq() { return chain; },
        async maybeSingle() { return table === "happy_occasion_preferences" ? { data: { country_code: "PL" }, error: null } : { data: { timezone: "Europe/Warsaw" }, error: null }; },
      };
      return chain;
    },
  };
  const result = await getUserOccasionsForLocalDay({ client, userId: "user-a", now: new Date("2026-09-29T22:30:00.000Z") });
  assert.deepEqual(calls.sort(), ["happy_occasion_preferences", "reminder_preferences"]);
  assert.equal(result[0]?.phase, "today");
  assert.equal(result[0]?.occurrenceKey, "occasion:pl_boys_day:2026");
});

test("occasion resolution performs no writes and has no AI/provider dependency", async () => {
  const source = await readFile(new URL("../src/lib/occasions/occasionResolver.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /insert\(|update\(|upsert\(|delete\(/);
  assert.doesNotMatch(source, /openai|provider|happyAgent/i);
});

test("country preference migration is owner-scoped and strict", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20261012183422_create_happy_occasion_preferences.sql", import.meta.url), "utf8");
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /country_code is null or country_code in \('PL'\)/);
  assert.match(sql, /happy_occasion_preferences_insert_own/);
  assert.match(sql, /auth\.uid\(\)\) = user_id/);
  assert.match(sql, /revoke all on table public\.happy_occasion_preferences from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /grant .* to anon/i);
});

test("country endpoint derives owner from authentication and rejects extra payload fields", async () => {
  const source = await readFile(new URL("../src/app/api/happy/preferences/occasion-country/route.ts", import.meta.url), "utf8");
  assert.match(source, /getAssistantRequestIdentity/);
  assert.match(source, /z\.object\(\{ countryCode: z\.union\(\[z\.literal\("PL"\), z\.null\(\)\]\) \}\)\.strict\(\)/);
  assert.doesNotMatch(source, /userId.*request\.json|body\.userId/);
});
