import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildAssistantMemoryContextFromSemanticMemory } from "../src/lib/assistant/assistantSemanticMemoryAdapter.ts";
import { formatAssistantContext } from "../src/lib/assistant/chatContract.ts";
import { buildAssistantMemoryContext } from "../src/lib/assistant/memoryContext.ts";
import { buildSemanticMemoryProjection } from "../src/lib/semantic-memory/index.ts";

function person(id, name = id) {
  return { id, name, relation: null, birthday: null, gender: null };
}

function knowledge(id, personId, overrides = {}) {
  return {
    id,
    personId,
    eventId: null,
    kind: "preference",
    category: "interest",
    polarity: null,
    title: null,
    value: `Fact ${id}`,
    occurredOn: null,
    importance: 0,
    tags: [],
    summary: null,
    state: "active",
    aiEligible: true,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: null,
    legacyType: "interest",
    evidence: {
      sourceKind: "manual",
      sourceId: id,
      originalText: null,
      capturedAt: "2026-07-01T00:00:00.000Z",
    },
    classification: null,
    compatibility: { valueText: `Fact ${id}`, contentText: null },
    ...overrides,
  };
}

function buildNew(people, sourceKnowledge) {
  return buildAssistantMemoryContextFromSemanticMemory({
    people,
    semanticMemory: buildSemanticMemoryProjection({ people, knowledge: sourceKnowledge, currentDate: new Date(0) }),
    sourceKnowledge,
  });
}

function assertParity(people, sourceKnowledge) {
  const oldOutput = buildAssistantMemoryContext(people, sourceKnowledge);
  const newOutput = buildNew(people, sourceKnowledge);
  assert.deepEqual(newOutput, oldOutput);
  const context = { userName: null, insight: null, events: [], people: [], memories: oldOutput };
  assert.equal(
    formatAssistantContext({ ...context, memories: newOutput }),
    formatAssistantContext(context),
  );
  return newOutput;
}

test("empty, one, titled, untitled and exact content fallback preserve parity", () => {
  assertParity([person("p1", "Anna")], []);
  const items = [
    knowledge("value", "p1"),
    knowledge("content", "p1", {
      title: "Content title", value: null, compatibility: { valueText: null, contentText: "Content text" },
    }),
    knowledge("title", "p1", {
      title: "Title only", value: null, compatibility: { valueText: null, contentText: null },
    }),
  ];
  const output = assertParity([person("p1", "Anna")], items);
  assert.deepEqual(output[0].memories.map(({ title, content }) => ({ title, content })), [
    { title: null, content: "Fact value" },
    { title: "Content title", content: "Content text" },
    { title: "Title only", content: "Title only" },
  ]);
});

test("undated, importance, occurredOn, createdAt and source-order sorting preserve parity", () => {
  const items = [
    knowledge("source-first", "p1", { createdAt: null }),
    knowledge("source-second", "p1", { createdAt: null }),
    knowledge("created", "p1", { createdAt: "2026-07-03T00:00:00.000Z" }),
    knowledge("occurred", "p1", { occurredOn: "2026-07-04", createdAt: "2020-01-01T00:00:00.000Z" }),
    knowledge("important", "p1", { importance: 2, occurredOn: "2020-01-01" }),
  ];
  const output = assertParity([person("p1")], items);
  assert.deepEqual(output[0].memories.map((item) => item.content), [
    "Fact important", "Fact occurred", "Fact created", "Fact source-first", "Fact source-second",
  ]);
});

test("equal values, conflicts, same names and fact/timeline overlap remain source-level", () => {
  const people = [person("p1", "Alex"), person("p2", "Alex")];
  const items = [
    knowledge("duplicate-a", "p1", { value: "Coffee", compatibility: { valueText: "Coffee", contentText: null } }),
    knowledge("duplicate-b", "p1", { value: "Coffee", compatibility: { valueText: "Coffee", contentText: null } }),
    knowledge("conflict-like", "p1", { value: "Tea", polarity: "likes", compatibility: { valueText: "Tea", contentText: null } }),
    knowledge("conflict-dislike", "p1", { value: "Tea", polarity: "dislikes", compatibility: { valueText: "Tea", contentText: null } }),
    knowledge("given", "p2", {
      kind: "gift", category: "given", legacyType: "gift", value: "Book", occurredOn: "2026-01-02",
      compatibility: { valueText: "Book", contentText: null }, classification: {
        confidence: 1, classifierVersion: "test", classifiedAt: "2026-01-02", userConfirmed: true,
      },
    }),
  ];
  const output = assertParity(people, items);
  assert.equal(output.length, 2);
  assert.equal(output[0].memories.length, 4);
  assert.equal(output[1].memories.length, 1);
});

test("eligibility and selected-person boundaries preserve parity", () => {
  const items = [
    knowledge("active", "p1"),
    knowledge("archived", "p1", { state: "archived" }),
    knowledge("proposed", "p1", { state: "proposed" }),
    knowledge("superseded", "p1", { state: "superseded" }),
    knowledge("private", "p1", { aiEligible: false }),
    knowledge("unassigned", null),
    knowledge("outside", "p2"),
  ];
  const output = assertParity([person("p1")], items);
  assert.deepEqual(output[0].memories.map((item) => item.content), ["Fact active"]);
});

test("generic note is the only compatibility exception to semantic authorization", () => {
  const note = knowledge("note", "p1", {
    kind: "note", category: null, legacyType: "note", value: "Loose note",
    compatibility: { valueText: null, contentText: "Loose note" },
  });
  const semanticMemory = buildSemanticMemoryProjection({ people: [person("p1")], knowledge: [note], currentDate: new Date(0) });
  assert.equal(semanticMemory.people[0].facts.length, 0);
  assert.equal(semanticMemory.people[0].timeline.length, 0);
  assertParity([person("p1")], [note]);

  const unclassifiedGift = knowledge("unclassified-gift", "p1", {
    kind: "gift", category: "idea", legacyType: "unknown", tags: [],
  });
  assert.deepEqual(buildNew([person("p1")], [unclassifiedGift]), []);
});

test("per-person, people and total limits preserve parity deterministically", () => {
  const people = Array.from({ length: 12 }, (_, index) => person(`p${index}`));
  const items = people.flatMap((item) => Array.from(
    { length: 6 },
    (_, index) => knowledge(`${item.id}-${index}`, item.id, { importance: 6 - index }),
  ));
  const first = assertParity(people, items);
  const second = buildNew(people, items);
  assert.deepEqual(second, first);
  assert.equal(first.length, 10);
  assert.equal(first.reduce((total, group) => total + group.memories.length, 0), 50);
  assert.ok(first.every((group) => group.memories.length === 5));
});

test("adapter does not mutate people, Semantic Memory or source Knowledge", () => {
  const people = [person("p1")];
  const items = [knowledge("a", "p1"), knowledge("b", "p1", { importance: 2 })];
  const semanticMemory = buildSemanticMemoryProjection({ people, knowledge: items, currentDate: new Date(0) });
  const before = structuredClone({ people, items, semanticMemory });
  buildAssistantMemoryContextFromSemanticMemory({ people, semanticMemory, sourceKnowledge: items });
  assert.deepEqual({ people, items, semanticMemory }, before);
});

test("architecture keeps semantic direction, prompt formatting and active-person ownership", async () => {
  const adapter = await readFile(new URL("../src/lib/assistant/assistantSemanticMemoryAdapter.ts", import.meta.url), "utf8");
  const semanticFiles = await Promise.all([
    "semanticMemory.types.ts", "semanticMemoryTaxonomy.ts", "buildSemanticMemoryProjection.ts", "index.ts",
  ].map((file) => readFile(new URL(`../src/lib/semantic-memory/${file}`, import.meta.url), "utf8")));
  const loader = await readFile(new URL("../src/lib/home/loadHome.ts", import.meta.url), "utf8");
  assert.match(adapter, /semantic-memory/);
  assert.equal(semanticFiles.some((source) => source.includes("/assistant/")), false);
  assert.doesNotMatch(adapter, /formatAssistantContext|resolveChatPerson|activePersonId|ACTIVE PERSON|MEMORIES \(/);
  assert.doesNotMatch(adapter, /lines\.push|•/);
  assert.match(loader, /buildAssistantMemoryContextFromSemanticMemory/);
  assert.doesNotMatch(loader, /buildAssistantMemoryContext\(/);
});
