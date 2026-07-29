import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildMemoryInsightForPerson,
  getGiftIdeasForPerson,
  getMemoriesForPerson,
  getPersonContextRecords,
  MEMORY_INSIGHT_PRIORITY,
} from "../src/lib/brain/engines/memoryInsightEngine.ts";
import {
  mapLegacyMemoryToKnowledge,
} from "../src/lib/knowledge/compatibilityMapper.ts";

const person = { id: "person-1", name: "Olek" };
const currentDate = new Date(2026, 6, 13, 12);

function row(id, type, value, overrides = {}) {
  return {
    id,
    user_id: "user-1",
    person_id: "person-1",
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
    person_name: "Olek",
    category: "birthday",
    personId: "person-1",
  };
}

function insight(items, upcomingEvent = event("birthday", 5)) {
  return buildMemoryInsightForPerson({
    person,
    event: upcomingEvent,
    memories: items,
    currentDate,
  });
}

test("saved gift insight preserves dominance, IDs, priority and gift separation", () => {
  const [idea, wish, previous, context] = knowledge([
    row("idea", "gift", "Album", {
      created_at: "2026-07-10T10:00:00.000Z",
    }),
    row("wish", "dream", "Podróż do Japonii"),
    row("previous", "gift", "Rower"),
    row("context", "hobby", "Fotografia"),
  ]);
  previous.category = "given";
  previous.classification = {
    confidence: 1,
    classifierVersion: "test",
    classifiedAt: "2026-07-01T10:00:00.000Z",
    userConfirmed: true,
  };

  const result = insight([previous, wish, context, idea]);

  assert.equal(result?.id, "memory-insight:gift-saved:person-1:birthday:idea");
  assert.equal(result?.type, "gift_saved");
  assert.equal(result?.priority, MEMORY_INSIGHT_PRIORITY.HIGH);
  assert.equal(result?.reason, "upcoming_event_and_saved_gift");
  assert.equal(result?.description, "Album");
  assert.deepEqual(result?.metadata?.sourceMemoryIds, ["idea"]);
  assert.deepEqual(
    getGiftIdeasForPerson([previous, wish, context, idea], person.id).map(
      (item) => item.id,
    ),
    ["idea"],
  );
});

test("context insight preserves duplicate record ordering and exact source IDs", () => {
  const items = knowledge([
    row("coffee-old", "coffee", "Flat White", {
      created_at: "2026-07-11T10:00:00.000Z",
    }),
    row("coffee-new", "coffee", "Flat White", {
      created_at: "2026-07-13T10:00:00.000Z",
    }),
    row("hobby", "hobby", "Fotografia", {
      created_at: "2026-07-12T10:00:00.000Z",
    }),
  ]);

  const records = getPersonContextRecords(items, person.id);
  const result = insight(items);

  assert.deepEqual(records.map((item) => item.id), [
    "coffee-new",
    "hobby",
    "coffee-old",
  ]);
  assert.equal(
    result?.id,
    "memory-insight:gift-context:person-1:birthday:coffee-new-hobby",
  );
  assert.equal(result?.type, "gift_suggestion_ready");
  assert.equal(result?.priority, MEMORY_INSIGHT_PRIORITY.HIGH);
  assert.equal(result?.reason, "upcoming_event_and_person_context");
  assert.deepEqual(result?.metadata?.sourceMemoryIds, ["coffee-new", "hobby"]);
  assert.match(result?.description ?? "", /Flat White · Fotografia/);
});

test("recent memory preserves occurredOn then createdAt sorting and generic copy", () => {
  const items = knowledge([
    row("created-newer", "story", null, {
      created_at: "2026-07-12T10:00:00.000Z",
      occurred_on: null,
    }),
    row("occurred-older", "memory", null, {
      title: "Starsze wspomnienie",
      created_at: "2026-07-13T10:00:00.000Z",
      occurred_on: "2026-07-10",
    }),
  ]);

  assert.deepEqual(
    getMemoriesForPerson(items, person.id).map((item) => item.id),
    ["created-newer", "occurred-older"],
  );
  const result = insight(items, null);
  assert.equal(
    result?.id,
    "memory-insight:recent-memory:person-1:created-newer",
  );
  assert.equal(result?.type, "recent_memory");
  assert.equal(result?.priority, MEMORY_INSIGHT_PRIORITY.LOW);
  assert.equal(result?.reason, "recent_linked_memory");
  assert.equal(result?.description, "Zapisane wspomnienie.");
  assert.deepEqual(result?.metadata?.sourceMemoryIds, ["created-newer"]);
});

test("missing context preserves boundary, priority and private exclusions", () => {
  const items = knowledge([
    row("journal", "journal", "PRYWATNE"),
    row("inactive", "coffee", "Ukryta kawa", { is_active: false }),
    row("note", "note", "Zwykła notatka"),
    row("unknown", "custom_type", "Nieznany typ"),
  ]);
  const result = insight(items, event("birthday-14", 14));

  assert.equal(
    result?.id,
    "memory-insight:missing-context:person-1:birthday-14",
  );
  assert.equal(result?.type, "missing_person_context");
  assert.equal(result?.priority, MEMORY_INSIGHT_PRIORITY.MEDIUM);
  assert.equal(result?.reason, "upcoming_event_missing_context");
  assert.deepEqual(result?.metadata?.sourceMemoryIds, []);
  assert.doesNotMatch(
    JSON.stringify(result),
    /PRYWATNE|Ukryta kawa|Zwykła notatka|Nieznany typ/,
  );
});

test("seven and eight day events preserve the exact priority boundary", () => {
  const items = knowledge([row("gift", "gift", "Album")]);

  assert.equal(
    insight(items, event("day-7", 7))?.priority,
    MEMORY_INSIGHT_PRIORITY.HIGH,
  );
  assert.equal(
    insight(items, event("day-8", 8))?.priority,
    MEMORY_INSIGHT_PRIORITY.MEDIUM,
  );
});

test("migrated Memory Insight remains deterministic and input-immutable", () => {
  const items = knowledge([
    row("coffee", "coffee", "Flat White"),
    row("memory", "memory", null, {
      title: "Spacer",
      occurred_on: "2026-07-08",
    }),
  ]);
  const birthday = event("deterministic", 5);
  const snapshot = structuredClone({ items, birthday });

  const first = insight(items, birthday);
  const second = insight(items, birthday);

  assert.deepEqual(first, second);
  assert.deepEqual({ items, birthday }, snapshot);
});

test("memoryInsightEngine delegates classification to Brain Semantic Memory", async () => {
  const source = await readFile(
    new URL(
      "../src/lib/brain/engines/memoryInsightEngine.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /buildPersonKnowledgeFromSemanticMemory/);
  assert.match(source, /getBrainSemanticMemorySourceProvenance/);
  assert.equal(source.includes("CONTEXT_TYPES"), false);
  assert.equal(source.includes("MEMORY_TYPES"), false);
  assert.equal(source.includes("consumerStoredType"), false);
  assert.equal(source.includes("normalizedType("), false);
});
