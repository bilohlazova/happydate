import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import ts from "typescript";

// The legacy Brain modules still contain extensionless relative imports. This
// test-only hook resolves them and applies the same TypeScript erasure expected
// by the application build, without changing production source.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      (specifier.startsWith("./") || specifier.startsWith("../"))
      && !/\.[^/]+$/.test(specifier)
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) {
      const source = readFileSync(new URL(url), "utf8");
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(source, {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
          },
          fileName: new URL(url).pathname,
        }).outputText,
      };
    }
    return nextLoad(url, context);
  },
});

const [
  { buildInsights },
  { buildMemoryInsight },
  { buildMemoryInsightForPerson, MEMORY_INSIGHT_PRIORITY },
  { buildPersonKnowledge },
  { buildPreferenceInsight },
  { planReminders, selectTopReminder },
] = await Promise.all([
  import("../src/lib/brain/buildInsights.ts"),
  import("../src/lib/brain/engines/memoryEngine.ts"),
  import("../src/lib/brain/engines/memoryInsightEngine.ts"),
  import("../src/lib/brain/engines/personKnowledgeEngine.ts"),
  import("../src/lib/brain/engines/preferenceEngine.ts"),
  import("../src/lib/brain/engines/reminderPlanningEngine.ts"),
]);

const currentDate = new Date(2026, 6, 13, 12);
const olek = { id: "olek", name: "Olek" };

function record(id, type, value, overrides = {}) {
  return {
    id,
    personId: "olek",
    eventId: null,
    type,
    title: null,
    value,
    content: null,
    importance: 0,
    occurredOn: null,
    createdAt: "2026-07-01T10:00:00.000Z",
    isActive: true,
    ...overrides,
  };
}

function event(id, days, overrides = {}) {
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
    person_name: "Olek",
    category: "birthday",
    personId: "olek",
    ...overrides,
  };
}

test("PersonKnowledge freezes values, ordering, provenance and completeness", () => {
  const memories = [
    record("coffee-old", "coffee", "FLAT WHITE", {
      createdAt: "2026-06-01T10:00:00.000Z",
    }),
    record("coffee-new", "coffee", " Flat   White ", {
      createdAt: "2026-07-10T10:00:00.000Z",
    }),
    record("hobby", "hobby", "Fotografia", {
      createdAt: "2026-07-09T10:00:00.000Z",
    }),
    record("gift-newest", "gift", " album ", {
      createdAt: "2026-07-12T10:00:00.000Z",
    }),
    record("gift-second", "gift", "Aparat", {
      createdAt: "2026-07-07T10:00:00.000Z",
    }),
    record("gift-duplicate", "gift", "ALBUM", {
      createdAt: "2026-07-06T10:00:00.000Z",
    }),
    record("memory-occurred", "memory", null, {
      content: "Wspólny wyjazd",
      occurredOn: "2026-07-20",
      createdAt: "2026-07-05T10:00:00.000Z",
    }),
    record("memory-created", "story", null, {
      content: "Wspólny spacer",
      createdAt: "2026-07-15T10:00:00.000Z",
    }),
    record("journal", "journal", "PRYWATNE", {
      createdAt: "2026-07-16T10:00:00.000Z",
    }),
    record("inactive", "food", "Ramen", {
      isActive: false,
      createdAt: "2026-07-17T10:00:00.000Z",
    }),
  ];

  const result = buildPersonKnowledge({ person: olek, memories, currentDate });

  assert.deepEqual(result.interests, []);
  assert.deepEqual(result.favoriteDrinks, ["Flat White"]);
  assert.deepEqual(result.hobbies, ["Fotografia"]);
  assert.deepEqual(result.favoriteFood, []);
  assert.deepEqual(
    result.giftIdeas,
    [
      {
        memoryId: "gift-newest",
        value: "album",
        createdAt: "2026-07-12T10:00:00.000Z",
      },
      {
        memoryId: "gift-second",
        value: "Aparat",
        createdAt: "2026-07-07T10:00:00.000Z",
      },
    ],
  );
  assert.equal(result.memoriesCount, 2);
  assert.equal(result.latestMemoryDate, "2026-07-20T00:00:00.000Z");
  assert.equal(result.knownFactsCount, 4);
  assert.equal(result.completenessScore, 50);
  assert.deepEqual(result.sourceMemoryIds, [
    "memory-created",
    "gift-newest",
    "coffee-new",
    "hobby",
    "gift-second",
    "memory-occurred",
  ]);
  assert.equal(result.sourceMemoryIds.includes("journal"), false);
  assert.equal(result.sourceMemoryIds.includes("inactive"), false);
  assert.equal(result.sourceMemoryIds.includes("coffee-old"), false);
  assert.equal(result.sourceMemoryIds.includes("gift-duplicate"), false);
});

test("Memory Insight freezes saved-gift, context, missing and recent-memory priorities", () => {
  const birthday = event("birthday-olek", 5);
  const savedGift = buildMemoryInsightForPerson({
    person: olek,
    event: birthday,
    memories: [record("gift", "gift", "Album")],
    currentDate,
  });
  const context = buildMemoryInsightForPerson({
    person: olek,
    event: birthday,
    memories: [
      record("coffee", "coffee", "Flat White", {
        createdAt: "2026-07-12T10:00:00.000Z",
      }),
      record("hobby", "hobby", "Fotografia", {
        createdAt: "2026-07-11T10:00:00.000Z",
      }),
      record("music", "music", "Jazz", {
        createdAt: "2026-07-10T10:00:00.000Z",
      }),
    ],
    currentDate,
  });
  const missing = buildMemoryInsightForPerson({
    person: olek,
    event: birthday,
    memories: [
      record("journal", "journal", "PRYWATNE"),
      record("inactive", "gift", "Ukryty prezent", { isActive: false }),
    ],
    currentDate,
  });
  const recent = buildMemoryInsightForPerson({
    person: olek,
    event: null,
    memories: [
      record("recent", "memory", null, {
        title: "Spacer nad Wisłą",
        occurredOn: "2026-07-08",
      }),
    ],
    currentDate,
  });

  assert.deepEqual(
    [savedGift?.type, savedGift?.priority, savedGift?.metadata?.sourceMemoryIds],
    ["gift_saved", MEMORY_INSIGHT_PRIORITY.HIGH, ["gift"]],
  );
  assert.deepEqual(
    [context?.type, context?.priority, context?.metadata?.sourceMemoryIds],
    ["gift_suggestion_ready", MEMORY_INSIGHT_PRIORITY.HIGH, ["coffee", "hobby"]],
  );
  assert.match(context?.description ?? "", /Flat White · Fotografia/);
  assert.doesNotMatch(context?.description ?? "", /Jazz/);
  assert.deepEqual(
    [missing?.type, missing?.priority, missing?.metadata?.sourceMemoryIds],
    ["missing_person_context", MEMORY_INSIGHT_PRIORITY.HIGH, []],
  );
  assert.deepEqual(
    [recent?.type, recent?.priority, recent?.metadata?.sourceMemoryIds],
    ["recent_memory", MEMORY_INSIGHT_PRIORITY.LOW, ["recent"]],
  );
  assert.doesNotMatch(JSON.stringify(missing), /PRYWATNE|Ukryty prezent/);
});

test("Memory Insight priority remains medium in the outer event window", () => {
  const result = buildMemoryInsightForPerson({
    person: olek,
    event: event("birthday-later", 20),
    memories: [record("gift", "gift", "Album")],
    currentDate,
  });

  assert.equal(result?.type, "gift_saved");
  assert.equal(result?.priority, MEMORY_INSIGHT_PRIORITY.MEDIUM);
});

test("Reminder Planning freezes windows, context order and source ordering", () => {
  const reminders = planReminders({
    people: [olek],
    events: [
      event("event-30", 30),
      event("event-14", 14),
      event("event-7", 7),
      event("event-3", 3),
      event("event-1", 1),
      event("event-0", 0),
    ],
    memories: [
      record("z-coffee", "coffee", "Flat White", {
        createdAt: "2026-07-10T10:00:00.000Z",
      }),
      record("a-hobby", "hobby", "Fotografia", {
        createdAt: "2026-07-12T10:00:00.000Z",
      }),
      record("music", "music", "Jazz", {
        createdAt: "2026-07-11T10:00:00.000Z",
      }),
    ],
    currentDate,
  });
  const byEvent = new Map(reminders.map((reminder) => [reminder.eventId, reminder]));

  assert.deepEqual(
    [...byEvent].map(([eventId, reminder]) => [
      eventId,
      reminder.activateOn,
      reminder.expiresOn,
      reminder.priority,
    ]),
    [
      ["event-0", "2026-07-13", "2026-07-14", "urgent"],
      ["event-1", "2026-07-13", "2026-07-14", "urgent"],
      ["event-3", "2026-07-13", "2026-07-15", "high"],
      ["event-7", "2026-07-13", "2026-07-17", "high"],
      ["event-14", "2026-07-13", "2026-07-20", "medium"],
      ["event-30", "2026-07-13", "2026-07-29", "low"],
    ],
  );

  const contextReminder = byEvent.get("event-7");
  assert.equal(contextReminder?.type, "gift_prepare");
  assert.equal(contextReminder?.params.context1, "Flat White");
  assert.equal(contextReminder?.params.context2, "Fotografia");
  assert.deepEqual(contextReminder?.sourceMemoryIds, ["a-hobby", "z-coffee"]);
  assert.equal(JSON.stringify(contextReminder).includes("Jazz"), false);
});

test("Reminder Planning freezes missing-context boundary and top ordering", () => {
  const withinBoundary = planReminders({
    people: [olek],
    events: [event("missing-14", 14)],
    memories: [
      record("journal", "journal", "PRYWATNE"),
      record("inactive", "coffee", "Latte", { isActive: false }),
    ],
    currentDate,
  })[0];
  const outsideBoundary = planReminders({
    people: [olek],
    events: [event("missing-15", 15)],
    memories: [],
    currentDate,
  })[0];
  const ordered = planReminders({
    people: [olek],
    events: [
      event("later", 7),
      event("same-day-z", 2),
      event("same-day-a", 2),
    ],
    memories: [],
    currentDate,
  });

  assert.equal(withinBoundary.type, "missing_person_context");
  assert.deepEqual(withinBoundary.sourceMemoryIds, []);
  assert.doesNotMatch(JSON.stringify(withinBoundary), /PRYWATNE|Latte/);
  assert.equal(outsideBoundary.type, "event_upcoming");
  assert.equal(selectTopReminder(ordered)?.eventId, "same-day-a");
  assert.deepEqual(
    ordered.map((reminder) => reminder.eventId),
    ["same-day-a", "same-day-z", "later"],
  );
});

test("legacy memoryEngine and preferenceEngine freeze first-match behavior", () => {
  const memories = [
    record("ignored-journal", "journal", "Sekret", { title: "Dziennik" }),
    record("first-memory", "note", "Treść notatki", { title: "Notatka" }),
    record("second-memory", "memory", "Treść wspomnienia", {
      title: "Wspomnienie",
    }),
    record("first-preference", "coffee", "Flat White", { title: "Kawa" }),
    record("second-preference", "hobby", "Fotografia", { title: "Hobby" }),
  ];

  assert.deepEqual(buildMemoryInsight({ memories }), {
    id: "memory-first-memory",
    type: "memory",
    priority: 100,
    icon: "💭",
    title: "Pamiętam",
    description: "Notatka: Treść notatki",
  });
  assert.deepEqual(buildPreferenceInsight({ memories }), {
    id: "preference-first-preference",
    type: "preference",
    priority: 50,
    icon: "⭐",
    title: "Preferencje",
    description: "Kawa: Flat White",
  });
});

test("buildInsights freezes the no-people fallback and priority ordering", () => {
  const insights = buildInsights({
    people: [],
    events: [],
    memories: [
      record("memory", "memory", "Wyjazd do Gdańska", {
        title: "Wspomnienie",
      }),
      record("preference", "coffee", "Flat White", { title: "Kawa" }),
    ],
    currentDate,
  });

  assert.deepEqual(
    insights.map(({ id, type, priority }) => ({ id, type, priority })),
    [
      { id: "memory-memory", type: "memory", priority: 100 },
      {
        id: "preference-preference",
        type: "preference",
        priority: 50,
      },
    ],
  );
});

test("characterized Brain operations are deterministic and do not mutate inputs", () => {
  const memories = [
    record("gift", "gift", "Album"),
    record("coffee", "coffee", "Flat White"),
    record("memory", "memory", null, {
      title: "Spacer",
      occurredOn: "2026-07-08",
    }),
  ];
  const birthday = event("birthday-deterministic", 5);
  const inputSnapshot = structuredClone({ memories, birthday });

  const firstKnowledge = buildPersonKnowledge({
    person: olek,
    memories,
    currentDate,
  });
  const secondKnowledge = buildPersonKnowledge({
    person: olek,
    memories,
    currentDate,
  });
  const firstInsight = buildMemoryInsightForPerson({
    person: olek,
    event: birthday,
    memories,
    currentDate,
  });
  const secondInsight = buildMemoryInsightForPerson({
    person: olek,
    event: birthday,
    memories,
    currentDate,
  });

  assert.deepEqual(firstKnowledge, secondKnowledge);
  assert.deepEqual(firstInsight, secondInsight);
  assert.deepEqual({ memories, birthday }, inputSnapshot);
});
