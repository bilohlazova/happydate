import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createTranslator } from "next-intl";

import {
  buildReminderPresentations,
  buildTopReminderPresentation,
} from "../src/lib/reminders/buildTopReminderPresentation.ts";

const root = process.cwd();
const now = new Date(2026, 6, 13, 12);
const olek = { id: "olek", name: "Olek" };
const kasia = { id: "kasia", name: "Kasia" };
async function translate(locale) {
  const dictionary = JSON.parse(await readFile(path.join(root, "messages", locale, "reminders.json"), "utf8"));
  return createTranslator({ locale, messages: { reminders: dictionary } });
}
function event(person, days, overrides = {}) {
  const date = new Date(2026, 6, 13 + days);
  return { id: `birthday-${person.id}-${days}`, title: `Birthday ${person.name}`, date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`, is_important: false, person_name: person.name, category: "birthday", personId: person.id, ...overrides };
}
function memory(person, id, type, value, overrides = {}) {
  return { id, personId: person.id, eventId: null, type, title: null, value, content: null, importance: 0, occurredOn: null, createdAt: "2026-07-10", isActive: true, ...overrides };
}
async function input(overrides = {}, locale = "pl") {
  return { people: [olek], events: [event(olek, 5)], memories: [], currentDate: now, translate: await translate(locale), ...overrides };
}

test("no events, past events and invalid current date return null", async () => {
  assert.equal(buildTopReminderPresentation(await input({ events: [] })), null);
  assert.equal(buildTopReminderPresentation(await input({ events: [event(olek, -1)] })), null);
  assert.equal(buildTopReminderPresentation(await input({ currentDate: new Date("invalid") })), null);
});
test("valid context reminder returns localized semantic and presentation data", async () => {
  const result = buildTopReminderPresentation(await input({ memories: [memory(olek, "coffee", "coffee", "Flat White"), memory(olek, "hobby", "hobby", "Fotografia")] }));
  assert.equal(result.plannedReminder.type, "gift_prepare");
  assert.match(result.presentation.title, /Olek/);
  assert.match(result.presentation.description, /Flat White/);
  assert.match(result.presentation.description, /Fotografia/);
});
test("saved gift, missing context and today variants cross the boundary", async () => {
  const gift = buildTopReminderPresentation(await input({ memories: [memory(olek, "gift", "gift", "Album")] }));
  const missing = buildTopReminderPresentation(await input());
  const today = buildTopReminderPresentation(await input({ events: [event(olek, 0)] }));
  assert.deepEqual([gift.plannedReminder.type, missing.plannedReminder.type, today.plannedReminder.type], ["gift_saved", "missing_person_context", "event_today"]);
});
test("manual two-person fixture selects Kasia tomorrow over Olek in five days", async () => {
  const result = buildTopReminderPresentation(await input({
    people: [olek, kasia], events: [event(olek, 5), event(kasia, 1)],
    memories: [memory(olek, "coffee", "coffee", "Flat White"), memory(olek, "hobby", "hobby", "Fotografia"), memory(kasia, "gift-k", "gift", "Album")],
  }));
  assert.equal(result.plannedReminder.type, "gift_saved");
  assert.equal(result.plannedReminder.personId, "kasia");
  assert.equal(result.presentation.actionUrl, "/people/kasia");
});
test("Olek today wins the manual fixture", async () => {
  const result = buildTopReminderPresentation(await input({ people: [olek, kasia], events: [event(olek, 0), event(kasia, 1)], memories: [memory(kasia, "gift-k", "gift", "Album")] }));
  assert.equal(result.plannedReminder.personId, "olek");
  assert.equal(result.plannedReminder.type, "event_today");
});
test("nearest event wins at equal priority", async () => {
  const result = buildTopReminderPresentation(await input({ people: [olek, kasia], events: [event(olek, 7), event(kasia, 2)] }));
  assert.equal(result.plannedReminder.personId, "kasia");
});
test("Polish, Ukrainian and German translators localize without changing user data", async () => {
  for (const locale of ["pl", "uk", "de"]) {
    const result = buildTopReminderPresentation(await input({ memories: [memory(olek, "coffee", "coffee", "Flat White"), memory(olek, "hobby", "hobby", "Fotografia")] }, locale));
    assert.match(result.presentation.title, /Olek/);
    assert.match(result.presentation.description, /Flat White/);
    assert.match(result.presentation.description, /Fotografia/);
  }
});
test("translation failure and malformed translation results return null", async () => {
  assert.equal(buildTopReminderPresentation(await input({ translate: () => { throw new Error("private translation detail"); } })), null);
  assert.equal(buildTopReminderPresentation(await input({ translate: () => "" })), null);
  assert.equal(buildTopReminderPresentation(await input({ translate: (key) => key })), null);
});
test("empty memories support generic reminder and missing knowledge computes canonically", async () => {
  const generic = buildTopReminderPresentation(await input({ events: [event(olek, 20)] }));
  const computed = buildTopReminderPresentation(await input({ memories: [memory(olek, "coffee", "coffee", "Flat White")] }));
  assert.equal(generic.plannedReminder.type, "event_upcoming");
  assert.equal(computed.plannedReminder.type, "gift_prepare");
});
test("supplied PersonKnowledge is reused", async () => {
  const knowledge = { personId: "olek", personName: "Olek", interests: [], favoritePlaces: [], favoriteFood: [], favoriteDrinks: [], hobbies: [], books: [], movies: [], music: [], pets: [], perfumes: [], flowers: [], travel: [], sports: [], giftIdeas: [{ memoryId: "supplied-gift", value: "Album" }], memoriesCount: 0, latestMemoryDate: null, knownFactsCount: 1, completenessScore: 15, sourceMemoryIds: ["supplied-gift"] };
  const result = buildTopReminderPresentation(await input({ personKnowledge: [knowledge], memories: [] }));
  assert.equal(result.plannedReminder.type, "gift_saved");
  assert.deepEqual(result.plannedReminder.sourceMemoryIds, ["supplied-gift"]);
});
test("inputs are immutable, repeated output deterministic and serializable", async () => {
  const value = await input({ memories: [memory(olek, "coffee", "coffee", "Flat White")] });
  const snapshot = structuredClone({ ...value, translate: undefined });
  const first = buildTopReminderPresentation(value);
  const second = buildTopReminderPresentation(value);
  assert.deepEqual(first, second);
  assert.deepEqual({ ...value, translate: undefined }, snapshot);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(first)));
});
test("journal and other-person content never crosses the boundary", async () => {
  const result = buildTopReminderPresentation(await input({ memories: [memory(olek, "journal", "journal", "PRIVATE", { content: "SECRET" }), memory(kasia, "other", "hobby", "Other value")] }));
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|SECRET|Other value|journal/);
});
test("source IDs, reason and action URL remain attached and preserved", async () => {
  const result = buildTopReminderPresentation(await input({ memories: [memory(olek, "gift", "gift", "Album")] }));
  assert.deepEqual(result.plannedReminder.sourceMemoryIds, ["gift"]);
  assert.equal(result.presentation.reason, result.plannedReminder.reason);
  assert.equal(result.presentation.actionUrl, result.plannedReminder.action.url);
});
test("generic dashboard fallback survives presentation", async () => {
  const important = event({ id: "none", name: "" }, 20, { id: "important", category: "meeting", is_important: true, personId: null, person_name: null });
  const result = buildTopReminderPresentation(await input({ people: [], events: [important] }));
  assert.equal(result.plannedReminder.action.url, "/dashboard");
  assert.equal(result.presentation.actionUrl, "/dashboard");
});
test("list boundary preserves planner order and skips only malformed presentations", async () => {
  const base = await input({ people: [olek, kasia], events: [event(olek, 0), event(kasia, 2)] });
  const valid = buildReminderPresentations(base);
  assert.deepEqual(valid.map((item) => item.plannedReminder.personId), ["olek", "kasia"]);
  const partial = buildReminderPresentations({ ...base, translate: (key, params) => key === "reminders.today.title" ? "" : base.translate(key, params) });
  assert.deepEqual(partial.map((item) => item.plannedReminder.personId), ["kasia"]);
});
