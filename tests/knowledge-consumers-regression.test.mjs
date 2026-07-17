import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildAssistantMemoryContext } from "../src/lib/assistant/memoryContext.ts";
import { buildMemoryInsightForPerson } from "../src/lib/brain/engines/memoryInsightEngine.ts";
import { buildPersonKnowledge } from "../src/lib/brain/engines/personKnowledgeEngine.ts";
import { planReminders } from "../src/lib/brain/engines/reminderPlanningEngine.ts";
import { mapLegacyMemoryToKnowledge } from "../src/lib/knowledge/compatibilityMapper.ts";

function legacyMemory(overrides = {}) {
  return {
    id: "memory-1",
    personId: "person-1",
    type: "coffee",
    title: "Kawa",
    value: "Flat White",
    content: "Bez cukru",
    importance: 2,
    occurredOn: null,
    createdAt: "2026-07-01T10:00:00.000Z",
    isActive: true,
    eventId: null,
    ...overrides,
  };
}

function toRow(memory) {
  return {
    id: memory.id,
    user_id: "user-1",
    person_id: memory.personId,
    event_id: memory.eventId,
    content_text: memory.content,
    audio_url: null,
    transcript_text: null,
    images: null,
    ai_summary: null,
    ai_tags: null,
    ai_emotional_score: null,
    created_at: memory.createdAt,
    updated_at: null,
    type: memory.type,
    title: memory.title,
    value_text: memory.value,
    occurred_on: memory.occurredOn,
    importance: memory.importance,
    source: "manual",
    is_active: memory.isActive,
  };
}

function canonical(memory) {
  return mapLegacyMemoryToKnowledge(toRow(memory));
}

test("Brain insights are identical after Memory-to-Knowledge migration", () => {
  const legacy = legacyMemory({ type: "gift", value: "LEGO" });
  const input = {
    person: { id: "person-1", name: "Anna" },
    event: {
      id: "birthday-person-1",
      title: "Urodziny Anna",
      date: "2026-07-22",
      is_important: true,
      person_name: "Anna",
      personId: "person-1",
      category: "birthday",
    },
    currentDate: new Date("2026-07-17T12:00:00"),
  };
  assert.deepEqual(
    buildMemoryInsightForPerson({ ...input, memories: [canonical(legacy)] }),
    buildMemoryInsightForPerson({ ...input, memories: [legacy] }),
  );
});

test("Person Knowledge aggregation preserves legacy output exactly", () => {
  const legacy = legacyMemory();
  const person = { id: "person-1", name: "Anna" };
  assert.deepEqual(
    buildPersonKnowledge({ person, memories: [canonical(legacy)] }),
    buildPersonKnowledge({ person, memories: [legacy] }),
  );
});

test("Assistant Context preserves sorting, fields and limits", () => {
  const legacy = legacyMemory();
  const people = [{ id: "person-1", name: "Anna", relation: "Mama", birthday: null, gender: null }];
  assert.deepEqual(
    buildAssistantMemoryContext(people, [canonical(legacy)]),
    buildAssistantMemoryContext(people, [legacy]),
  );
});

test("Reminder decisions and semantic descriptors remain identical", () => {
  const legacy = legacyMemory({ type: "gift", title: "Pomysł", value: "LEGO" });
  const input = {
    people: [{ id: "person-1", name: "Anna" }],
    events: [{
      id: "birthday-person-1",
      title: "Urodziny Anna",
      date: "2026-07-22",
      is_important: true,
      person_name: "Anna",
      personId: "person-1",
      category: "birthday",
    }],
    currentDate: new Date("2026-07-17T12:00:00"),
  };
  assert.deepEqual(
    planReminders({ ...input, memories: [canonical(legacy)] }),
    planReminders({ ...input, memories: [legacy] }),
  );
});

test("Brain and Assistant consumers no longer depend on MemoryRow or BrainMemory", async () => {
  const paths = [
    "../src/lib/brain/buildInsights.ts",
    "../src/lib/brain/loadBrain.ts",
    "../src/lib/brain/engines/memoryEngine.ts",
    "../src/lib/brain/engines/preferenceEngine.ts",
    "../src/lib/brain/engines/memoryInsightEngine.ts",
    "../src/lib/brain/engines/personKnowledgeEngine.ts",
    "../src/lib/brain/engines/reminderPlanningEngine.ts",
    "../src/lib/assistant/memoryContext.ts",
    "../src/hooks/useAssistantHomeContext.ts",
  ];
  const sources = await Promise.all(
    paths.map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  );

  for (const source of sources) {
    assert.equal(source.includes("MemoryRow"), false);
    assert.equal(source.includes("BrainMemory"), false);
    assert.equal(source.includes("getBrainMemories"), false);
  }
});
