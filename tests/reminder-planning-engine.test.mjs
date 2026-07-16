import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReminderForEvent,
  getActiveReminderStage,
  planReminders,
  selectTopReminder,
} from "../src/lib/brain/engines/reminderPlanningEngine.ts";

const now = new Date(2026, 6, 13, 23, 30);
const olek = { id: "olek", name: "Olek" };
function event(days, overrides = {}) {
  const date = new Date(2026, 6, 13 + days);
  return {
    id: `birthday-${days}`,
    title: "Urodziny",
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    is_important: false,
    person_name: "Olek",
    category: "birthday",
    personId: "olek",
    ...overrides,
  };
}
function memory(id, type, value, overrides = {}) {
  return { id, personId: "olek", eventId: null, type, title: null, value, content: null, importance: 0, occurredOn: null, createdAt: "2026-07-10", isActive: true, ...overrides };
}
function plan(days, memories = [], overrides = {}) {
  return planReminders({ people: [olek], events: [event(days)], memories, currentDate: now, ...overrides })[0] ?? null;
}

test("past and malformed events produce no reminder", () => {
  assert.equal(plan(-1), null);
  assert.equal(plan(1, [], { events: [event(1, { date: "not-a-date" })] }), null);
});
test("events beyond 30 days produce no preparation reminder", () => assert.equal(plan(31), null));
test("today produces urgent event_today", () => {
  const result = plan(0);
  assert.equal(result.type, "event_today");
  assert.equal(result.priority, "urgent");
  assert.equal(result.reason, "event_today");
});
test("tomorrow is urgent and uses the one-day window", () => {
  const result = plan(1);
  assert.equal(result.priority, "urgent");
  assert.equal(result.activateOn, "2026-07-13");
  assert.equal(result.expiresOn, "2026-07-14");
});
test("active stages select only the current window", () => {
  assert.equal(getActiveReminderStage({ eventDate: "2026-07-18", currentDate: now }), 7);
  assert.equal(getActiveReminderStage({ eventDate: "2026-07-15", currentDate: now }), 3);
  assert.equal(getActiveReminderStage({ eventDate: "2026-07-13", currentDate: now }), 0);
});
test("five-day fixture uses high priority and seven-day activation", () => {
  const result = plan(5, [memory("coffee", "coffee", "Flat White"), memory("hobby", "hobby", "Fotografia")]);
  assert.equal(result.type, "gift_prepare");
  assert.equal(result.priority, "high");
  assert.equal(result.activateOn, "2026-07-11");
  assert.equal(result.expiresOn, "2026-07-15");
  assert.equal(result.params.context1, "Flat White");
  assert.equal(result.params.context2, "Fotografia");
});
test("saved gift replaces context and missing-context reminders", () => {
  const result = plan(5, [memory("gift", "gift", "Album fotograficzny"), memory("hobby", "hobby", "Fotografia")]);
  assert.equal(result.type, "gift_saved");
  assert.deepEqual(result.sourceMemoryIds, ["gift"]);
  assert.equal("context1" in result.params, false);
});
test("context without a gift is limited to two unchanged values", () => {
  const result = plan(5, [memory("a", "coffee", "Flat White"), memory("b", "hobby", "Fotografia"), memory("c", "music", "Jazz")]);
  assert.equal(result.type, "gift_prepare");
  assert.deepEqual([result.params.context1, result.params.context2], ["Flat White", "Fotografia"]);
  assert.equal(JSON.stringify(result.params).includes("Jazz"), false);
});
test("missing context is used only inside fourteen days", () => {
  assert.equal(plan(14).type, "missing_person_context");
  assert.equal(plan(20).type, "event_upcoming");
});
test("journal, inactive and other-person records are ignored", () => {
  const result = plan(5, [
    memory("journal", "journal", "Sekret", { content: "Prywatne" }),
    memory("inactive", "gift", "Album", { isActive: false }),
    memory("other", "hobby", "Rower", { personId: "kasia" }),
  ]);
  assert.equal(result.type, "missing_person_context");
  assert.equal(JSON.stringify(result.params).includes("Sekret"), false);
  assert.equal(JSON.stringify(result.params).includes("Prywatne"), false);
});
test("today overrides saved gifts and context", () => {
  assert.equal(plan(0, [memory("gift", "gift", "Album"), memory("h", "hobby", "Foto")]).type, "event_today");
});
test("one deterministic reminder is emitted per event", () => {
  const input = { people: [olek], events: [event(5), event(5)], memories: [], currentDate: now };
  assert.equal(planReminders(input).length, 1);
  assert.deepEqual(planReminders(input), planReminders(input));
});
test("priority mapping covers high, medium and low", () => {
  assert.deepEqual([plan(2).priority, plan(8).priority, plan(20).priority], ["high", "medium", "low"]);
});
test("thirty, fourteen, seven, three and today windows have calendar boundaries", () => {
  const cases = [
    [30, "2026-07-13", "2026-07-29"], [14, "2026-07-13", "2026-07-20"],
    [7, "2026-07-13", "2026-07-17"], [3, "2026-07-13", "2026-07-15"],
    [0, "2026-07-13", "2026-07-14"],
  ];
  for (const [days, activateOn, expiresOn] of cases) {
    const result = plan(days);
    assert.equal(result.activateOn, activateOn);
    assert.equal(result.expiresOn, expiresOn);
  }
});
test("date-only input does not shift at a late local time", () => {
  const result = buildReminderForEvent({ event: event(1, { date: "2026-07-14" }), person: olek, currentDate: new Date(2026, 6, 13, 23, 59) });
  assert.equal(result.eventDate, "2026-07-14");
  assert.equal(result.params.daysUntil, 1);
});
test("selectTopReminder chooses priority, then nearest date, then deterministic ID", () => {
  const reminders = planReminders({ people: [olek], events: [event(7, { id: "z" }), event(2, { id: "b" }), event(2, { id: "a" })], memories: [], currentDate: now });
  assert.equal(selectTopReminder(reminders).eventId, "a");
  assert.equal(selectTopReminder([]), null);
});
test("important event without a valid person uses dashboard fallback", () => {
  const result = planReminders({ people: [], events: [event(5, { id: "important", category: "meeting", is_important: true, personId: "missing", person_name: null })], memories: [], currentDate: now })[0];
  assert.equal(result.action.url, "/dashboard");
  assert.equal(result.personId, undefined);
});
test("ordinary low-value events and unowned birthdays are ignored", () => {
  const ordinary = event(5, { id: "ordinary", category: "meeting", is_important: false, personId: null, person_name: null });
  const birthday = event(5, { personId: null, person_name: null });
  assert.deepEqual(planReminders({ people: [], events: [ordinary, birthday], memories: [], currentDate: now }), []);
});
test("source IDs contain only records contributing to chosen context", () => {
  const result = plan(5, [memory("coffee", "coffee", "Flat White"), memory("hobby", "hobby", "Fotografia"), memory("music", "music", "Jazz")]);
  assert.deepEqual(result.sourceMemoryIds, ["coffee", "hobby"]);
});
test("output is serializable, semantic-key based, and contains no Polish primary strings", () => {
  const result = plan(5);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(result)));
  assert.match(result.titleKey, /^reminders\./);
  assert.match(result.descriptionKey, /^reminders\./);
  assert.match(result.actionLabelKey, /^reminders\.actions\./);
  assert.equal("fallbackTitle" in result, false);
  assert.equal("fallbackDescription" in result, false);
});
test("inputs are not mutated and person names remain unchanged", () => {
  const input = { people: [{ id: "olek", name: "Ołeksandr Олег" }], events: [event(5, { person_name: "Ołeksandr Олег" })], memories: [memory("h", "hobby", "Fotografia")], currentDate: now };
  const snapshot = structuredClone(input);
  const result = planReminders(input)[0];
  assert.deepEqual(input, snapshot);
  assert.equal(result.params.personName, "Ołeksandr Олег");
});
test("supplied PersonKnowledge is used without requiring memory aggregation", () => {
  const knowledge = { personId: "olek", personName: "Olek", interests: [], favoritePlaces: [], favoriteFood: [], favoriteDrinks: ["Flat White"], hobbies: ["Fotografia"], books: [], movies: [], music: [], pets: [], perfumes: [], flowers: [], travel: [], sports: [], giftIdeas: [], memoriesCount: 0, latestMemoryDate: null, knownFactsCount: 2, completenessScore: 10, sourceMemoryIds: [] };
  const result = plan(5, [], { personKnowledge: [knowledge] });
  assert.deepEqual([result.params.context1, result.params.context2], ["Flat White", "Fotografia"]);
});
