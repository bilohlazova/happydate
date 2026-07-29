import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  planReminders,
  selectTopReminder,
} from "../src/lib/brain/engines/reminderPlanningEngine.ts";
import {
  mapLegacyMemoryToKnowledge,
} from "../src/lib/knowledge/compatibilityMapper.ts";

const currentDate = new Date(2026, 6, 13, 12);
const person = { id: "person-1", name: "Olek" };

function row(id, type, value, overrides = {}) {
  return {
    id,
    user_id: "user-1",
    person_id: person.id,
    event_id: null,
    content_text: null,
    audio_url: null,
    transcript_text: null,
    images: null,
    ai_summary: null,
    ai_tags: null,
    ai_emotional_score: null,
    created_at: "2026-07-01T10:00:00.000Z",
    updated_at: null,
    type,
    title: null,
    value_text: value,
    occurred_on: null,
    importance: 0,
    source: "manual",
    is_active: true,
    ...overrides,
  };
}

function knowledge(rows) {
  return rows.map(mapLegacyMemoryToKnowledge);
}

function event(id, days) {
  const date = new Date(2026, 6, 13 + days, 12);
  return {
    id,
    title: "Urodziny Olka",
    date: [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-"),
    is_important: true,
    person_name: person.name,
    category: "birthday",
    personId: person.id,
  };
}

function plan(days, memories = [], overrides = {}) {
  return planReminders({
    people: [person],
    events: [event(`event-${days}`, days)],
    memories,
    currentDate,
    ...overrides,
  })[0] ?? null;
}

test("semantic PersonKnowledge preserves reminder context order and two-value limit", () => {
  const result = plan(5, knowledge([
    row("hobby", "hobby", "Fotografia", {
      created_at: "2026-07-13T10:00:00.000Z",
    }),
    row("coffee", "coffee", "Flat White", {
      created_at: "2026-07-12T10:00:00.000Z",
    }),
    row("interest", "interest", "Sztuka", {
      created_at: "2026-07-11T10:00:00.000Z",
    }),
  ]));

  assert.equal(result?.type, "gift_prepare");
  assert.deepEqual(
    [result?.params.context1, result?.params.context2],
    ["Sztuka", "Flat White"],
  );
  assert.equal(JSON.stringify(result).includes("Fotografia"), false);
});

test("duplicate context values keep every contributing source ID", () => {
  const result = plan(5, knowledge([
    row("interest-z", "interest", "  Sztuka   współczesna  "),
    row("interest-a", "interest", "Sztuka współczesna", {
      created_at: "2026-07-02T10:00:00.000Z",
    }),
    row("coffee", "coffee", "Flat White"),
    row("third", "hobby", "Fotografia"),
  ]));

  assert.deepEqual(
    [result?.params.context1, result?.params.context2],
    ["Sztuka współczesna", "Flat White"],
  );
  assert.deepEqual(result?.sourceMemoryIds, [
    "coffee",
    "interest-a",
    "interest-z",
  ]);
});

test("reminder stages preserve windows, priorities and deterministic ordering", () => {
  const reminders = planReminders({
    people: [person],
    events: [
      event("day-30", 30),
      event("day-14", 14),
      event("day-7", 7),
      event("day-3", 3),
      event("day-1", 1),
      event("day-0", 0),
    ],
    memories: [],
    currentDate,
  });

  assert.deepEqual(
    reminders.map((reminder) => [
      reminder.eventId,
      reminder.priority,
      reminder.activateOn,
      reminder.expiresOn,
    ]),
    [
      ["day-0", "urgent", "2026-07-13", "2026-07-14"],
      ["day-1", "urgent", "2026-07-13", "2026-07-14"],
      ["day-3", "high", "2026-07-13", "2026-07-15"],
      ["day-7", "high", "2026-07-13", "2026-07-17"],
      ["day-14", "medium", "2026-07-13", "2026-07-20"],
      ["day-30", "low", "2026-07-13", "2026-07-29"],
    ],
  );
  assert.equal(selectTopReminder(reminders)?.eventId, "day-0");
});

test("private, inactive, note and unknown records preserve missing context behavior", () => {
  const result = plan(14, knowledge([
    row("journal", "journal", "PRYWATNE"),
    row("inactive", "coffee", "Ukryta kawa", { is_active: false }),
    row("note", "note", "Zwykła notatka"),
    row("unknown", "custom_type", "Nieznany typ"),
  ]));

  assert.equal(result?.type, "missing_person_context");
  assert.equal(result?.priority, "medium");
  assert.equal(result?.reason, "event_missing_context");
  assert.deepEqual(result?.sourceMemoryIds, []);
  assert.doesNotMatch(
    JSON.stringify(result),
    /PRYWATNE|Ukryta kawa|Zwykła notatka|Nieznany typ/,
  );
});

test("current gift ideas remain separate from wishes and previous gifts", () => {
  const [wish, previous] = knowledge([
    row("wish", "dream", "Podróż do Japonii"),
    row("previous", "gift", "Rower"),
  ]);
  previous.category = "given";
  previous.classification = {
    confidence: 1,
    classifierVersion: "test",
    classifiedAt: "2026-07-01T10:00:00.000Z",
    userConfirmed: true,
  };

  const withoutCurrentIdea = plan(5, [wish, previous]);
  const withCurrentIdea = plan(5, [
    wish,
    previous,
    ...knowledge([row("idea", "gift", "Album")]),
  ]);

  assert.equal(withoutCurrentIdea?.type, "missing_person_context");
  assert.deepEqual(withoutCurrentIdea?.sourceMemoryIds, []);
  assert.equal(withCurrentIdea?.type, "gift_saved");
  assert.deepEqual(withCurrentIdea?.sourceMemoryIds, ["idea"]);
});

test("precomputed PersonKnowledge remains supported without source aggregation", () => {
  const precomputed = {
    personId: person.id,
    personName: person.name,
    interests: [],
    favoritePlaces: [],
    favoriteFood: [],
    favoriteDrinks: ["Flat White"],
    hobbies: ["Fotografia"],
    books: [],
    movies: [],
    music: [],
    pets: [],
    perfumes: [],
    flowers: [],
    travel: [],
    sports: [],
    giftIdeas: [],
    memoriesCount: 99,
    latestMemoryDate: "2026-07-12T10:00:00.000Z",
    knownFactsCount: 2,
    completenessScore: 100,
    sourceMemoryIds: ["external"],
  };
  const result = plan(5, [], { personKnowledge: [precomputed] });

  assert.equal(result?.type, "gift_prepare");
  assert.deepEqual(
    [result?.params.context1, result?.params.context2],
    ["Flat White", "Fotografia"],
  );
  assert.deepEqual(result?.sourceMemoryIds, []);
});

test("semantic reminder planning is deterministic and input-immutable", () => {
  const input = {
    people: [person],
    events: [event("z", 2), event("a", 2), event("later", 7)],
    memories: knowledge([
      row("interest", "interest", "Sztuka"),
      row("coffee", "coffee", "Flat White"),
    ]),
    currentDate,
  };
  const snapshot = structuredClone(input);

  const first = planReminders(input);
  const second = planReminders(input);

  assert.deepEqual(first, second);
  assert.deepEqual(first.map((reminder) => reminder.eventId), [
    "a",
    "z",
    "later",
  ]);
  assert.deepEqual(input, snapshot);
});

test("reminderPlanningEngine delegates raw classification to Brain Semantic Memory", async () => {
  const source = await readFile(
    new URL(
      "../src/lib/brain/engines/reminderPlanningEngine.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /buildPersonKnowledgeFromSemanticMemory/);
  assert.match(source, /getBrainSemanticMemorySourceProvenance/);
  assert.match(source, /selectBrainPersonKnowledgeContextValues/);
  assert.equal(source.includes("CONTEXT_KEYS"), false);
  assert.equal(source.includes("consumerStoredType"), false);
  assert.equal(source.includes("buildAllPeopleKnowledge"), false);
  assert.equal(source.includes("personKnowledgeEngine"), false);
});
