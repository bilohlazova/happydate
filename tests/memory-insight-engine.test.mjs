import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMemoryInsightForPerson,
  getGiftIdeasForPerson,
  getMemoriesForPerson,
  getMemoryInsightEventDaysUntil,
  getPersonContextRecords,
  MEMORY_INSIGHT_PRIORITY,
} from "../src/lib/brain/engines/memoryInsightEngine.ts";

const currentDate = new Date(2026, 6, 13, 12);
const person = { id: "olek", name: "Olek" };

function event(days, overrides = {}) {
  const date = new Date(2026, 6, 13 + days, 12);
  return {
    id: "birthday-olek",
    title: "Urodziny Olka",
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    is_important: false,
    person_name: "Olek",
    category: "birthday",
    personId: "olek",
    ...overrides,
  };
}

function memory(id, type, value, overrides = {}) {
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
    createdAt: "2026-07-10T10:00:00.000Z",
    isActive: true,
    ...overrides,
  };
}

function insight(memories, upcomingEvent = event(5)) {
  return buildMemoryInsightForPerson({
    person,
    event: upcomingEvent,
    memories,
    currentDate,
  });
}

test("birthday in five days plus saved gift returns saved gift insight", () => {
  const result = insight([memory("gift-1", "gift", "Album fotograficzny")]);
  assert.equal(result?.type, "gift_saved");
  assert.equal(result?.priority, MEMORY_INSIGHT_PRIORITY.HIGH);
});

test("saved gift uses the most recently created value_text projection", () => {
  const result = insight([
    memory("older", "gift", "Kubek", { createdAt: "2026-07-01T10:00:00Z" }),
    memory("newer", "gift", "Album", { createdAt: "2026-07-12T10:00:00Z" }),
  ]);
  assert.equal(result?.description, "Album");
  assert.deepEqual(result?.metadata?.sourceMemoryIds, ["newer"]);
});

test("saved gift suppresses a context recommendation", () => {
  const result = insight([
    memory("coffee", "coffee", "Kawa speciality"),
    memory("gift", "gift", "Album"),
  ]);
  assert.equal(result?.type, "gift_saved");
});

test("birthday plus context and no gift returns gift context insight", () => {
  const result = insight([memory("coffee", "coffee", "Kawa speciality")]);
  assert.equal(result?.type, "gift_suggestion_ready");
  assert.equal(result?.reason, "upcoming_event_and_person_context");
});

test("context description and metadata include at most two safe values", () => {
  const result = insight([
    memory("coffee", "coffee", "Kawa speciality", { createdAt: "2026-07-12" }),
    memory("hobby", "hobby", "Fotografia", { createdAt: "2026-07-11" }),
    memory("music", "music", "Jazz", { createdAt: "2026-07-10" }),
  ]);
  assert.match(result?.description ?? "", /Kawa speciality · Fotografia/);
  assert.doesNotMatch(result?.description ?? "", /Jazz/);
  assert.equal(result?.metadata?.sourceMemoryIds.length, 2);
});

test("birthday in five days without gift or context returns missing context", () => {
  assert.equal(insight([])?.type, "missing_person_context");
});

test("event in twenty days gives medium priority", () => {
  const result = insight([memory("gift", "gift", "Album")], event(20));
  assert.equal(result?.priority, MEMORY_INSIGHT_PRIORITY.MEDIUM);
});

test("event beyond thirty days does not trigger a gift insight", () => {
  assert.equal(insight([memory("gift", "gift", "Album")], event(31)), null);
});

test("journal record is ignored as context", () => {
  const result = insight([
    memory("journal", "journal", "Prywatny wpis", { content: "Sekret" }),
  ]);
  assert.equal(result?.type, "missing_person_context");
});

test("unassigned note is ignored", () => {
  const result = insight([
    memory("note", "note", "Fotografia", { personId: null }),
  ]);
  assert.equal(result?.type, "missing_person_context");
});

test("context belonging to another person is ignored", () => {
  const result = insight([
    memory("other", "hobby", "Rower", { personId: "kasia" }),
  ]);
  assert.equal(result?.type, "missing_person_context");
});

test("inactive record is ignored", () => {
  const result = insight([
    memory("inactive", "gift", "Album", { isActive: false }),
  ]);
  assert.equal(result?.type, "missing_person_context");
});

test("recent linked memory generates a low-priority insight without event", () => {
  const result = insight([
    memory("shared", "memory", null, {
      title: "Spacer nad Wisłą",
      occurredOn: "2026-07-08",
    }),
  ], null);
  assert.equal(result?.type, "recent_memory");
  assert.equal(result?.priority, MEMORY_INSIGHT_PRIORITY.LOW);
  assert.equal(result?.description, "Spacer nad Wisłą");
});

test("recent memory is suppressed by an urgent saved-gift insight", () => {
  const result = insight([
    memory("shared", "memory", null, { occurredOn: "2026-07-08" }),
    memory("gift", "gift", "Album"),
  ]);
  assert.equal(result?.type, "gift_saved");
});

test("legacy story counts as a memory", () => {
  const records = [memory("story", " STORY ", null, { occurredOn: "2026-07-08" })];
  assert.deepEqual(getMemoriesForPerson(records, "olek").map((item) => item.id), ["story"]);
  assert.equal(insight(records, null)?.type, "recent_memory");
});

test("unknown legacy raw type is ignored as preference context", () => {
  const records = [memory("unknown", "favorite_color", "Niebieski")];
  assert.deepEqual(getPersonContextRecords(records, "olek"), []);
  assert.equal(insight(records)?.type, "missing_person_context");
});

test("one person receives at most one insight", () => {
  const result = insight([
    memory("gift", "gift", "Album"),
    memory("coffee", "coffee", "Kawa"),
    memory("shared", "memory", null, { occurredOn: "2026-07-08" }),
  ]);
  assert.ok(result);
  assert.equal(Array.isArray(result), false);
  assert.equal(result.type, "gift_saved");
});

test("insight id is deterministic for identical input", () => {
  const memories = [memory("gift", "gift", "Album")];
  assert.equal(insight(memories)?.id, insight(memories)?.id);
});

test("saved gift reason code is exact", () => {
  assert.equal(
    insight([memory("gift", "gift", "Album")])?.reason,
    "upcoming_event_and_saved_gift",
  );
});

test("journal content never appears in output", () => {
  const privateText = "NIGDY NIE POKAZUJ";
  const result = insight([
    memory("journal", "journal", privateText, {
      title: privateText,
      content: privateText,
    }),
  ]);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(privateText));
});

test("gift selector normalizes type and rejects empty values", () => {
  const records = [
    memory("valid", " GIFT ", "Album"),
    memory("empty", "gift", "   "),
  ];
  assert.deepEqual(getGiftIdeasForPerson(records, "olek").map((item) => item.id), ["valid"]);
});

test("missing context does not trigger after fourteen days", () => {
  assert.equal(insight([], event(15)), null);
});

test("ordinary non-important event does not trigger gift rules", () => {
  const ordinaryEvent = event(5, {
    id: "event-1",
    category: "personal",
    is_important: false,
  });
  assert.equal(insight([memory("gift", "gift", "Album")], ordinaryEvent), null);
});

test("event window rejects past events and accepts a future birthday", () => {
  assert.equal(getMemoryInsightEventDaysUntil(event(-1), currentDate), null);
  assert.equal(getMemoryInsightEventDaysUntil(event(5), currentDate), 5);
});

test("recent memory selector ignores notes even when linked", () => {
  const records = [memory("note", "note", null, { occurredOn: "2026-07-08" })];
  assert.deepEqual(getMemoriesForPerson(records, "olek"), []);
  assert.equal(insight(records, null), null);
});
