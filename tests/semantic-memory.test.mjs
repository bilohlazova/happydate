import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSemanticMemoryProjection,
  normalizeSemanticMemoryValue,
  SEMANTIC_MEMORY_TAXONOMY_VERSION,
  SEMANTIC_MEMORY_VERSION,
} from "../src/lib/semantic-memory/index.ts";

function knowledge(overrides = {}) {
  return {
    id: "knowledge-1",
    personId: "person-1",
    eventId: null,
    kind: "preference",
    category: "interest",
    polarity: "likes",
    title: null,
    value: "Motorcycles",
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
      sourceId: "source-1",
      originalText: "Motorcycles",
      capturedAt: "2026-07-01T00:00:00.000Z",
    },
    classification: {
      confidence: 0.9,
      classifierVersion: "test",
      classifiedAt: "2026-07-01T00:00:00.000Z",
      userConfirmed: true,
    },
    compatibility: {
      valueText: "Motorcycles",
      contentText: null,
    },
    ...overrides,
  };
}

function projection(items, options = {}) {
  return buildSemanticMemoryProjection({
    people: [{ id: "person-1" }],
    knowledge: items,
    currentDate: new Date("2026-07-23T12:00:00.000Z"),
    ...options,
  });
}

test("semantic projection exposes versioned pure read model with relationship placeholder", () => {
  const model = projection([]);

  assert.equal(model.version, SEMANTIC_MEMORY_VERSION);
  assert.equal(model.taxonomyVersion, SEMANTIC_MEMORY_TAXONOMY_VERSION);
  assert.equal(model.generatedAt, "2026-07-23T12:00:00.000Z");
  assert.deepEqual(model.relationships, []);
  assert.deepEqual(model.people.map((person) => person.personId), ["person-1"]);
});

test("semantic projection maps one fact to multiple canonical tags without duplicating category arrays", () => {
  const model = projection([
    knowledge({
      id: "ducati",
      value: "Ducati",
      category: "interest",
      tags: ["brand", "vehicle", "technology"],
      legacyType: "interest",
    }),
  ]);

  const fact = model.people[0].facts[0];
  assert.equal(fact.value, "Ducati");
  assert.deepEqual(fact.tags, ["brand", "interest", "like", "technology", "vehicle"]);
  assert.equal(Array.isArray(model.people[0].facts), true);
  assert.equal("categories" in model.people[0], false);
});

test("semantic projection represents preferred style as a semantic tag without importing Gift concepts", () => {
  const model = projection([
    knowledge({
      id: "style",
      title: "preferred_style",
      value: "Minimalistyczny",
      category: "general",
      polarity: null,
      legacyType: "preferred_style",
    }),
  ]);

  assert.deepEqual(model.people[0].facts[0].tags, ["lifestyle", "preferred_style"]);
});

test("semantic projection preserves user values and normalizes only for matching", () => {
  const model = projection([
    knowledge({ id: "coffee", value: "  Kawa z kardamonem  ", category: "coffee" }),
  ]);

  const fact = model.people[0].facts[0];
  assert.equal(fact.value, "Kawa z kardamonem");
  assert.equal(fact.normalizedValue, "kawa z kardamonem");
  assert.equal(normalizeSemanticMemoryValue(" Café—Ducati! "), "cafe ducati");
});

test("semantic projection deduplicates normalized values and merges tags, sources and dates deterministically", () => {
  const model = projection([
    knowledge({
      id: "older",
      value: "Ducati",
      category: "interest",
      tags: ["vehicle"],
      createdAt: "2026-07-01T00:00:00.000Z",
    }),
    knowledge({
      id: "newer",
      value: " ducati ",
      category: "brand",
      tags: ["technology"],
      createdAt: "2026-07-20T00:00:00.000Z",
      evidence: {
        sourceKind: "chat",
        sourceId: "source-2",
        originalText: "ducati",
        capturedAt: "2026-07-20T00:00:00.000Z",
      },
    }),
  ]);

  const fact = model.people[0].facts[0];
  assert.equal(model.people[0].facts.length, 1);
  assert.equal(fact.value, "ducati");
  assert.deepEqual(fact.sourceKnowledgeIds, ["newer", "older"]);
  assert.deepEqual(fact.tags, ["brand", "interest", "like", "technology", "vehicle"]);
  assert.equal(fact.firstSeenAt, "2026-07-01T00:00:00.000Z");
  assert.equal(fact.lastSeenAt, "2026-07-20T00:00:00.000Z");
});

test("semantic projection keeps score numeric, deterministic and clamped to 0..1", () => {
  const model = projection([
    knowledge({
      id: "important",
      importance: 50,
      evidence: {
        sourceKind: "manual",
        sourceId: "source-1",
        originalText: "Motorcycles",
        capturedAt: "2026-07-01T00:00:00.000Z",
      },
    }),
  ]);

  const fact = model.people[0].facts[0];
  assert.equal(typeof fact.score, "number");
  assert.equal(fact.score >= 0 && fact.score <= 1, true);
  assert.equal(fact.score, 1);
});

test("semantic projection excludes archived, inactive, proposed, journal and AI-ineligible knowledge", () => {
  const model = projection([
    knowledge({ id: "active", value: "Motorcycles" }),
    knowledge({ id: "archived", value: "Archived", state: "archived" }),
    knowledge({ id: "superseded", value: "Old", state: "superseded" }),
    knowledge({ id: "proposed", value: "Draft", state: "proposed" }),
    knowledge({ id: "journal", value: "Private", kind: "journal", aiEligible: false }),
    knowledge({ id: "ineligible", value: "No AI", aiEligible: false }),
  ]);

  assert.deepEqual(model.people[0].facts.map((fact) => fact.value), ["Motorcycles"]);
});

test("semantic projection treats previous gifts only as confirmed given gifts", () => {
  const model = projection([
    knowledge({
      id: "given",
      kind: "gift",
      category: "given",
      value: "Kwiaty",
      polarity: null,
      occurredOn: "2026-05-01",
      classification: {
        confidence: 1,
        classifierVersion: "test",
        classifiedAt: "2026-05-01T00:00:00.000Z",
        userConfirmed: true,
      },
    }),
    knowledge({
      id: "purchased",
      kind: "gift",
      category: "purchased",
      value: "Perfumy",
      polarity: null,
      classification: {
        confidence: 1,
        classifierVersion: "test",
        classifiedAt: "2026-05-01T00:00:00.000Z",
        userConfirmed: true,
      },
    }),
    knowledge({
      id: "unconfirmed-given",
      kind: "gift",
      category: "given",
      value: "Voucher",
      polarity: null,
      classification: null,
    }),
  ]);

  const facts = model.people[0].facts;
  assert.equal(facts.find((fact) => fact.value === "Kwiaty")?.tags.includes("previous_gift"), true);
  assert.equal(facts.find((fact) => fact.value === "Perfumy")?.tags.includes("previous_gift"), false);
  assert.equal(facts.find((fact) => fact.value === "Voucher")?.tags.includes("previous_gift"), false);
  assert.deepEqual(model.people[0].timeline, [{
    id: "semantic-timeline:given",
    personId: "person-1",
    kind: "previous_gift",
    title: "Kwiaty",
    date: "2026-05-01",
    sourceKnowledgeIds: ["given"],
  }]);
});

test("semantic projection includes experiences in timeline without inventing relationship graph edges", () => {
  const model = projection([
    knowledge({
      id: "trip",
      kind: "experience",
      category: "travel",
      polarity: null,
      value: "Wyjazd do Zakopanego",
      occurredOn: "2026-04-01",
      legacyType: "memory",
    }),
  ]);

  assert.deepEqual(model.people[0].timeline.map((item) => item.kind), ["memory"]);
  assert.deepEqual(model.relationships, []);
});

test("semantic projection marks conflicting polarity without guessing which fact is true", () => {
  const model = projection([
    knowledge({ id: "like", value: "Kawa", polarity: "likes" }),
    knowledge({ id: "dislike", value: "kawa", polarity: "dislikes", category: "food" }),
  ]);

  const fact = model.people[0].facts[0];
  assert.equal(fact.state, "conflicting");
  assert.deepEqual(fact.tags, ["dislike", "favorite_food", "interest", "like"]);
});

test("semantic projection is deterministic and does not mutate input", () => {
  const source = [
    knowledge({ id: "b", value: "Books", category: "book", createdAt: "2026-07-02T00:00:00.000Z" }),
    knowledge({ id: "a", value: "Music", category: "music", createdAt: "2026-07-03T00:00:00.000Z" }),
  ];
  const before = structuredClone(source);

  const first = projection(source);
  const second = projection([...source].reverse());

  assert.deepEqual(source, before);
  assert.deepEqual(first, second);
  assert.deepEqual(first.people[0].facts.map((fact) => fact.value), ["Music", "Books"]);
});

test("semantic projection preserves unassigned facts separately", () => {
  const model = projection([
    knowledge({
      id: "unassigned",
      personId: null,
      value: "General wish",
      kind: "wish",
      category: "wishlist",
      polarity: null,
      legacyType: "wish",
    }),
  ]);

  assert.equal(model.unassigned.length, 1);
  assert.equal(model.unassigned[0].personId, null);
  assert.deepEqual(model.unassigned[0].tags, ["wishlist"]);
});
