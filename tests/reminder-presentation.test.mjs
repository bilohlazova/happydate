import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createTranslator } from "next-intl";

import { planReminders } from "../src/lib/brain/engines/reminderPlanningEngine.ts";
import {
  REMINDER_MESSAGE_KEYS,
  hasRequiredReminderParams,
  hasSupportedReminderMessageKeys,
  presentReminder,
} from "../src/lib/reminders/presentReminder.ts";

const root = process.cwd();
const locales = ["pl", "uk", "en", "ru", "de"];
const now = new Date(2026, 6, 13, 12);
const person = { id: "olek", name: "Olek" };
async function messages(locale) {
  return JSON.parse(await readFile(path.join(root, "messages", locale, "reminders.json"), "utf8"));
}
async function translator(locale) {
  return createTranslator({ locale, messages: { reminders: await messages(locale) } });
}
function event(days, overrides = {}) {
  const date = new Date(2026, 6, 13 + days);
  return { id: `birthday-${days}`, title: "Urodziny", date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`, is_important: false, person_name: "Olek", category: "birthday", personId: "olek", ...overrides };
}
function memory(id, type, value) {
  return { id, personId: "olek", eventId: null, type, title: null, value, content: null, importance: 0, occurredOn: null, createdAt: "2026-07-10", isActive: true };
}
function reminder(days, memories = []) {
  return planReminders({ people: [person], events: [event(days)], memories, currentDate: now })[0];
}
function paths(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" ? paths(child, next) : [next];
  });
}

test("every engine-emitted key exists in all five reminder dictionaries", async () => {
  for (const locale of locales) {
    const keys = new Set(paths(await messages(locale)).map((key) => `reminders.${key}`));
    assert.deepEqual(REMINDER_MESSAGE_KEYS.filter((key) => !keys.has(key)), []);
  }
});
test("reminder dictionaries have exact parity and no empty values", async () => {
  const expected = paths(await messages("pl")).sort();
  for (const locale of locales) {
    const current = await messages(locale);
    assert.deepEqual(paths(current).sort(), expected);
    for (const key of paths(current)) {
      const value = key.split(".").reduce((node, part) => node[part], current);
      assert.equal(typeof value, "string");
      assert.ok(value.trim());
    }
  }
});
test("five locale fixtures present their intended reminder variants", async () => {
  const fixtures = [
    ["pl", reminder(0), "Dziś ważny dzień dla Olek"],
    ["uk", reminder(5, [memory("gift", "gift", "Album")]), "У вас уже є ідея для Olek"],
    ["en", reminder(5, [memory("coffee", "coffee", "Flat White"), memory("hobby", "hobby", "Fotografia")]), "Happy has a starting point for Olek"],
    ["ru", reminder(5), "Добавьте одну деталь о Olek"],
    ["de", reminder(20), "Ein wichtiges Datum rückt näher"],
  ];
  for (const [locale, input, expectedTitle] of fixtures) {
    const output = presentReminder({ reminder: input, translate: await translator(locale) });
    assert.equal(output.title, expectedTitle);
  }
});
test("ICU pluralization covers 1, 2, 5 and 21 days", async () => {
  const pl = await translator("pl");
  const uk = await translator("uk");
  const ru = await translator("ru");
  const en = await translator("en");
  const de = await translator("de");
  assert.match(pl("reminders.upcoming.description", { daysUntil: 1 }), /jutro/);
  assert.match(pl("reminders.upcoming.description", { daysUntil: 2 }), /2 dni/);
  assert.match(uk("reminders.upcoming.description", { daysUntil: 5 }), /5 днів/);
  assert.match(ru("reminders.upcoming.description", { daysUntil: 21 }), /21 день/);
  assert.match(en("reminders.upcoming.description", { daysUntil: 2 }), /2 days/);
  assert.match(de("reminders.upcoming.description", { daysUntil: 5 }), /5 Tage/);
});
test("person and context values preserve exact casing and punctuation", async () => {
  const customPerson = { id: "olek", name: "Ołeksandr Олег-S." };
  const input = planReminders({ people: [customPerson], events: [event(5, { person_name: customPerson.name })], memories: [memory("coffee", "coffee", "Flat WHITE!"), memory("hobby", "hobby", "Фото / Fotografia")], currentDate: now })[0];
  const output = presentReminder({ reminder: input, translate: await translator("uk") });
  assert.match(output.title, /Ołeksandr Олег-S\./);
  assert.match(output.description, /Flat WHITE!/);
  assert.match(output.description, /Фото \/ Fotografia/);
});
test("validation rejects unknown keys and missing required params safely", async () => {
  const valid = reminder(5);
  assert.equal(hasSupportedReminderMessageKeys(valid), true);
  assert.equal(hasRequiredReminderParams(valid), true);
  assert.equal(presentReminder({ reminder: { ...valid, titleKey: "reminders.unknown.title" }, translate: await translator("en") }), null);
  assert.equal(presentReminder({ reminder: { ...valid, params: { daysUntil: 5 } }, translate: await translator("en") }), null);
});
test("known translation failures use legacy fallback only when available", () => {
  const valid = { ...reminder(5), fallbackTitle: "Legacy title", fallbackDescription: "Legacy description" };
  const translate = (key) => {
    if (key.endsWith("title") || key.endsWith("description")) throw new Error("private translation failure");
    return "Safe action";
  };
  assert.deepEqual(presentReminder({ reminder: valid, translate }), {
    id: valid.id, title: "Legacy title", description: "Legacy description", actionLabel: "Safe action",
    actionUrl: valid.action.url, priority: valid.priority, type: valid.type, reason: valid.reason, sourceMemoryIds: [],
  });
  assert.equal(presentReminder({ reminder: { ...valid, fallbackTitle: undefined }, translate }), null);
});
test("presentation is serializable, immutable, and preserves routing metadata", async () => {
  const input = { ...reminder(5, [memory("gift", "gift", "Album fotograficzny")]), params: { ...reminder(5, [memory("gift", "gift", "Album fotograficzny")]).params, giftIdea: "Album fotograficzny" } };
  const snapshot = structuredClone(input);
  const output = presentReminder({ reminder: input, translate: await translator("pl") });
  assert.deepEqual(input, snapshot);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(output)));
  assert.equal(output.actionUrl, input.action.url);
  assert.equal(output.reason, input.reason);
  assert.deepEqual(output.sourceMemoryIds, input.sourceMemoryIds);
  assert.equal(input.params.giftIdea, "Album fotograficzny");
});
test("raw types, unknown params, and journal content cannot enter presentation copy", async () => {
  const base = reminder(5);
  const input = { ...base, params: { ...base.params, rawType: "restaurant", journalContent: "PRIVATE JOURNAL" } };
  const output = presentReminder({ reminder: input, translate: await translator("en") });
  assert.doesNotMatch(JSON.stringify(output), /restaurant|PRIVATE JOURNAL/);
});
test("non-Polish dictionaries do not copy complete Polish messages", async () => {
  const polish = await messages("pl");
  const polishValues = new Set(paths(polish).map((key) => key.split(".").reduce((node, part) => node[part], polish)));
  for (const locale of ["uk", "en", "ru", "de"]) {
    const current = await messages(locale);
    for (const key of paths(current)) {
      const value = key.split(".").reduce((node, part) => node[part], current);
      assert.equal(polishValues.has(value), false, `${locale}:${key}`);
    }
  }
});
test("rendered German and Russian mobile copy stays within documented practical limits", async () => {
  for (const locale of ["de", "ru"]) {
    const output = presentReminder({ reminder: reminder(5), translate: await translator(locale) });
    assert.ok(output.title.length <= 60);
    assert.ok(output.description.length <= 150);
    assert.ok(output.actionLabel.length <= 24);
  }
});
