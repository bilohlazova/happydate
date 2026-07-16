import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAllPeopleKnowledge,
  buildPersonKnowledge,
  calculatePersonKnowledgeCompleteness,
  countPersonKnownFacts,
  extractPersonKnowledgeValue,
} from "../src/lib/brain/engines/personKnowledgeEngine.ts";

const olek = { id: "olek", name: "Olek" };

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
    createdAt: "2026-07-01T10:00:00.000Z",
    isActive: true,
    ...overrides,
  };
}

test("empty person returns empty arrays and score zero", () => {
  const result = buildPersonKnowledge({ person: olek, memories: [] });
  assert.deepEqual(result.favoriteDrinks, []);
  assert.deepEqual(result.giftIdeas, []);
  assert.equal(result.memoriesCount, 0);
  assert.equal(result.knownFactsCount, 0);
  assert.equal(result.completenessScore, 0);
});

for (const [name, record] of [
  ["another person's records", memory("other", "coffee", "Latte", { personId: "kasia" })],
  ["inactive records", memory("inactive", "coffee", "Latte", { isActive: false })],
  ["journal", memory("journal", "journal", "private text")],
  ["generic note", memory("note", "note", "private note")],
  ["unknown raw type", memory("unknown", "custom_legacy", "private value")],
]) {
  test(`${name} are ignored`, () => {
    const result = buildPersonKnowledge({ person: olek, memories: [record] });
    assert.equal(result.knownFactsCount, 0);
    assert.deepEqual(result.sourceMemoryIds, []);
  });
}

test("coffee maps to favoriteDrinks", () => {
  assert.deepEqual(
    buildPersonKnowledge({ person: olek, memories: [memory("c", "coffee", "Flat White")] }).favoriteDrinks,
    ["Flat White"],
  );
});

test("restaurant maps to favoritePlaces", () => {
  assert.deepEqual(
    buildPersonKnowledge({ person: olek, memories: [memory("r", "restaurant", "Ramen")] }).favoritePlaces,
    ["Ramen"],
  );
});

test("hobby maps correctly", () => {
  assert.deepEqual(
    buildPersonKnowledge({ person: olek, memories: [memory("h", "hobby", "Fotografia")] }).hobbies,
    ["Fotografia"],
  );
});

test("interest and preference map to interests", () => {
  const result = buildPersonKnowledge({
    person: olek,
    memories: [memory("i", "interest", "Sztuka"), memory("p", "preference", "Minimalizm")],
  });
  assert.deepEqual(result.interests, ["Sztuka", "Minimalizm"]);
});

test("food and drink use separate requested categories", () => {
  const result = buildPersonKnowledge({
    person: olek,
    memories: [memory("f", "food", "Ramen"), memory("d", "drink", "Herbata")],
  });
  assert.deepEqual(result.favoriteFood, ["Ramen"]);
  assert.deepEqual(result.favoriteDrinks, ["Herbata"]);
});

test("entertainment types map without exposing raw labels", () => {
  const result = buildPersonKnowledge({
    person: olek,
    memories: [memory("b", "book", "Solaris"), memory("m", "movie", "Arrival"), memory("u", "music", "Jazz")],
  });
  assert.deepEqual([result.books, result.movies, result.music], [["Solaris"], ["Arrival"], ["Jazz"]]);
});

test("lifestyle types map to their canonical lists", () => {
  const types = ["pet", "perfume", "flower", "travel", "sport"];
  const result = buildPersonKnowledge({
    person: olek,
    memories: types.map((type) => memory(type, type, type.toUpperCase())),
  });
  assert.deepEqual([result.pets, result.perfumes, result.flowers, result.travel, result.sports], types.map((type) => [type.toUpperCase()]));
});

test("gift maps to giftIdeas", () => {
  const result = buildPersonKnowledge({ person: olek, memories: [memory("g", "gift", "Album")] });
  assert.equal(result.giftIdeas[0].memoryId, "g");
  assert.equal(result.giftIdeas[0].value, "Album");
});

for (const type of ["memory", "story"]) {
  test(`${type} increments memoriesCount`, () => {
    const result = buildPersonKnowledge({ person: olek, memories: [memory(type, type, null, { content: "Wyjazd" })] });
    assert.equal(result.memoriesCount, 1);
    assert.equal(result.knownFactsCount, 0);
  });
}

test("latest memory prefers occurredOn for each record", () => {
  const result = buildPersonKnowledge({
    person: olek,
    memories: [memory("m", "memory", null, {
      content: "Wyjazd",
      occurredOn: "2026-06-03",
      createdAt: "2026-07-10T10:00:00Z",
    })],
  });
  assert.equal(result.latestMemoryDate, "2026-06-03T00:00:00.000Z");
});

test("latest memory falls back to createdAt", () => {
  const result = buildPersonKnowledge({ person: olek, memories: [memory("m", "memory", null, { content: "Wyjazd" })] });
  assert.equal(result.latestMemoryDate, "2026-07-01T10:00:00.000Z");
});

test("duplicate values are case-insensitive and newest spelling wins", () => {
  const result = buildPersonKnowledge({
    person: olek,
    memories: [
      memory("old", "coffee", "FLAT WHITE", { createdAt: "2026-06-01" }),
      memory("new", "coffee", " Flat   White ", { createdAt: "2026-07-01" }),
    ],
  });
  assert.deepEqual(result.favoriteDrinks, ["Flat White"]);
  assert.deepEqual(result.sourceMemoryIds, ["new"]);
});

test("gift ideas are newest first and deduplicated", () => {
  const result = buildPersonKnowledge({
    person: olek,
    memories: [
      memory("old", "gift", "Album", { createdAt: "2026-05-01" }),
      memory("new", "gift", "Aparat", { createdAt: "2026-07-01" }),
      memory("duplicate", "gift", " album ", { createdAt: "2026-06-01" }),
    ],
  });
  assert.deepEqual(result.giftIdeas.map((gift) => gift.value), ["Aparat", "album"]);
});

test("empty values are ignored", () => {
  const result = buildPersonKnowledge({ person: olek, memories: [memory("empty", "coffee", "  ")] });
  assert.deepEqual(result.favoriteDrinks, []);
});

test("value has extraction priority over title and content", () => {
  assert.equal(extractPersonKnowledgeValue(memory("x", "coffee", "Value", { title: "Title", content: "Content" })), "Value");
});

test("title fallback works", () => {
  assert.equal(extractPersonKnowledgeValue(memory("x", "coffee", null, { title: "Title" })), "Title");
});

test("content fallback works only for eligible known types", () => {
  assert.equal(extractPersonKnowledgeValue(memory("x", "coffee", null, { content: "Content" })), "Content");
  assert.equal(extractPersonKnowledgeValue(memory("y", "note", null, { content: "Private" })), null);
});

test("knownFactsCount uses unique normalized values globally", () => {
  const knowledge = buildPersonKnowledge({
    person: olek,
    memories: [memory("a", "coffee", "Ramen"), memory("b", "restaurant", " ramen "), memory("c", "gift", "Album")],
  });
  assert.equal(knowledge.knownFactsCount, 2);
  assert.equal(countPersonKnownFacts(knowledge), 2);
});

test("completeness is clamped to 100", () => {
  const knowledge = buildPersonKnowledge({
    person: olek,
    memories: [
      memory("i", "interest", "Sztuka"), memory("h", "hobby", "Foto"),
      memory("f", "food", "Ramen"), memory("p", "place", "Gdańsk"),
      memory("b", "book", "Solaris"), memory("g", "gift", "Album"),
      memory("m", "memory", null, { content: "Wyjazd" }), memory("t", "travel", "Góry"),
    ],
  });
  assert.equal(calculatePersonKnowledgeCompleteness(knowledge), 100);
});

test("source IDs contain unique contributing records only", () => {
  const result = buildPersonKnowledge({
    person: olek,
    memories: [memory("c", "coffee", "Latte"), memory("j", "journal", "private"), memory("c", "gift", "Album")],
  });
  assert.deepEqual(result.sourceMemoryIds, ["c"]);
});

test("buildAllPeopleKnowledge preserves order and includes empty people", () => {
  const people = [{ id: "kasia", name: "Kasia" }, olek];
  const result = buildAllPeopleKnowledge({ people, memories: [memory("c", "coffee", "Latte")] });
  assert.deepEqual(result.map((item) => item.personId), ["kasia", "olek"]);
  assert.equal(result[0].knownFactsCount, 0);
  assert.equal(result[1].knownFactsCount, 1);
});

test("result is deterministic and input is not mutated", () => {
  const memories = [memory("z", "coffee", "Latte"), memory("a", "hobby", "Foto")];
  const snapshot = structuredClone(memories);
  const first = buildPersonKnowledge({ person: olek, memories });
  const second = buildPersonKnowledge({ person: olek, memories });
  assert.deepEqual(first, second);
  assert.deepEqual(memories, snapshot);
});

test("documented Olek fixture excludes journal and yields four facts", () => {
  const result = buildPersonKnowledge({
    person: olek,
    memories: [
      memory("coffee-new", "coffee", "Flat White", { createdAt: "2026-07-02" }),
      memory("coffee-old", "coffee", "flat white", { createdAt: "2026-07-01" }),
      memory("restaurant", "restaurant", "Ramen"),
      memory("hobby", "hobby", "Fotografia"),
      memory("gift", "gift", "Album fotograficzny"),
      memory("memory", "memory", null, { content: "Wyjazd do Gdańska" }),
      memory("journal", "journal", "private text"),
    ],
  });
  assert.deepEqual(result.favoriteDrinks, ["Flat White"]);
  assert.deepEqual(result.favoritePlaces, ["Ramen"]);
  assert.deepEqual(result.hobbies, ["Fotografia"]);
  assert.deepEqual(result.giftIdeas.map((gift) => gift.value), ["Album fotograficzny"]);
  assert.equal(result.memoriesCount, 1);
  assert.equal(result.knownFactsCount, 4);
  assert.equal(result.completenessScore, 60);
  assert.equal(result.sourceMemoryIds.includes("journal"), false);
});
