import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import {
  buildPersonKnowledgeFromSemanticMemory,
} from "../src/lib/brain/brainSemanticMemoryAdapter.ts";
import {
  buildPersonKnowledge,
} from "../src/lib/brain/engines/personKnowledgeEngine.ts";
import {
  mapLegacyMemoryToKnowledge,
} from "../src/lib/knowledge/compatibilityMapper.ts";

const person = { id: "person-1", name: "Olek" };
const currentDate = new Date("2026-07-13T12:00:00.000Z");

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

function build(items) {
  return buildPersonKnowledgeFromSemanticMemory({
    person,
    knowledge: items,
    currentDate,
  });
}

test("adapter preserves exact PersonKnowledge parity through engine delegation", () => {
  const items = knowledge([
    row("coffee", "coffee", "Flat White"),
    row("hobby", "hobby", "Fotografia"),
    row("gift", "gift", "Album"),
    row("memory", "memory", null, {
      content_text: "Wyjazd",
      occurred_on: "2026-07-08",
    }),
  ]);

  assert.deepEqual(
    build(items),
    buildPersonKnowledge({ person, memories: items, currentDate }),
  );
  assert.deepEqual(build(items), {
    personId: "person-1",
    personName: "Olek",
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
    giftIdeas: [{
      memoryId: "gift",
      value: "Album",
      createdAt: "2026-07-01T10:00:00.000Z",
    }],
    memoriesCount: 1,
    latestMemoryDate: "2026-07-08T00:00:00.000Z",
    knownFactsCount: 3,
    completenessScore: 50,
    sourceMemoryIds: ["coffee", "gift", "hobby", "memory"],
  });
});

test("adapter maps every supported legacy category through semantic tags", () => {
  const rows = [
    row("01-interest", "interest", "Sztuka"),
    row("02-preference", "preference", "Minimalizm"),
    row("03-place", "place", "Gdańsk"),
    row("04-restaurant", "restaurant", "Ramen House"),
    row("05-food", "food", "Ramen"),
    row("06-coffee", "coffee", "Flat White"),
    row("07-drink", "drink", "Herbata"),
    row("08-hobby", "hobby", "Fotografia"),
    row("09-book", "book", "Solaris"),
    row("10-movie", "movie", "Arrival"),
    row("11-music", "music", "Jazz"),
    row("12-pet", "pet", "Kot"),
    row("13-perfume", "perfume", "Cedr"),
    row("14-flower", "flower", "Tulipan"),
    row("15-travel", "travel", "Góry"),
    row("16-sport", "sport", "Rower"),
    row("17-gift", "gift", "Album"),
    row("18-memory", "story", null, { content_text: "Wspólny spacer" }),
  ];

  const result = build(knowledge(rows));

  assert.deepEqual(result.interests, ["Sztuka", "Minimalizm"]);
  assert.deepEqual(result.favoritePlaces, ["Gdańsk", "Ramen House"]);
  assert.deepEqual(result.favoriteFood, ["Ramen"]);
  assert.deepEqual(result.favoriteDrinks, ["Flat White", "Herbata"]);
  assert.deepEqual(result.hobbies, ["Fotografia"]);
  assert.deepEqual(result.books, ["Solaris"]);
  assert.deepEqual(result.movies, ["Arrival"]);
  assert.deepEqual(result.music, ["Jazz"]);
  assert.deepEqual(result.pets, ["Kot"]);
  assert.deepEqual(result.perfumes, ["Cedr"]);
  assert.deepEqual(result.flowers, ["Tulipan"]);
  assert.deepEqual(result.travel, ["Góry"]);
  assert.deepEqual(result.sports, ["Rower"]);
  assert.deepEqual(result.giftIdeas.map((gift) => gift.value), ["Album"]);
  assert.equal(result.memoriesCount, 1);
  assert.equal(result.knownFactsCount, 17);
  assert.equal(result.completenessScore, 100);
  assert.deepEqual(result.sourceMemoryIds, rows.map((item) => item.id));
});

test("multi-tag semantic facts retain the existing single PersonKnowledge bucket", () => {
  const items = knowledge([
    row("hobby", "hobby", "Fotografia"),
    row("sport", "sport", "Rower"),
    row("book", "book", "Solaris"),
  ]);
  items[0].tags = ["interest", "hobby"];
  items[1].tags = ["interest", "sport"];
  items[2].tags = ["interest", "book"];

  const result = build(items);

  assert.deepEqual(result.hobbies, ["Fotografia"]);
  assert.deepEqual(result.sports, ["Rower"]);
  assert.deepEqual(result.books, ["Solaris"]);
  assert.deepEqual(result.interests, []);
});

test("adapter preserves newest duplicate winner, spelling, ordering and source IDs", () => {
  const result = build(knowledge([
    row("coffee-old", "coffee", "FLAT WHITE", {
      created_at: "2026-07-01T10:00:00.000Z",
    }),
    row("coffee-new", "coffee", " Flat   White ", {
      created_at: "2026-07-03T10:00:00.000Z",
    }),
    row("coffee-second", "coffee", "Espresso", {
      created_at: "2026-07-02T10:00:00.000Z",
    }),
    row("gift-old", "gift", "ALBUM", {
      created_at: "2026-07-01T10:00:00.000Z",
    }),
    row("gift-new", "gift", " album ", {
      created_at: "2026-07-04T10:00:00.000Z",
    }),
  ]));

  assert.deepEqual(result.favoriteDrinks, ["Flat White", "Espresso"]);
  assert.deepEqual(result.giftIdeas.map((gift) => gift.value), ["album"]);
  assert.deepEqual(result.sourceMemoryIds, [
    "gift-new",
    "coffee-new",
    "coffee-second",
  ]);
});

test("source records preserve memory count, date fallback and missing dates", () => {
  const result = build(knowledge([
    row("missing-date", "memory", null, {
      content_text: "Bez daty",
      created_at: null,
    }),
    row("created-date", "story", null, {
      content_text: "Data utworzenia",
      created_at: "2026-07-09T10:00:00.000Z",
    }),
    row("occurred-date", "memory", null, {
      content_text: "Data wydarzenia",
      occurred_on: "2026-07-12",
      created_at: "2026-07-01T10:00:00.000Z",
    }),
    row("invalid-occurred", "memory", null, {
      content_text: "Nieprawidłowa data wydarzenia",
      occurred_on: "invalid",
      created_at: "2026-07-11T10:00:00.000Z",
    }),
  ]));

  assert.equal(result.memoriesCount, 4);
  assert.equal(result.latestMemoryDate, "2026-07-12T00:00:00.000Z");
  assert.deepEqual(result.sourceMemoryIds, [
    "invalid-occurred",
    "created-date",
    "occurred-date",
    "missing-date",
  ]);
});

test("adapter excludes inactive, journal, note, unknown and other-person records", () => {
  const result = build(knowledge([
    row("active", "coffee", "Flat White"),
    row("inactive", "hobby", "Ukryte hobby", { is_active: false }),
    row("journal", "journal", "Prywatny dziennik"),
    row("note", "note", "Zwykła notatka"),
    row("unknown", "custom_type", "Nieznany typ"),
    row("other", "coffee", "Espresso", { person_id: "person-2" }),
  ]));

  assert.deepEqual(result.favoriteDrinks, ["Flat White"]);
  assert.equal(result.knownFactsCount, 1);
  assert.deepEqual(result.sourceMemoryIds, ["active"]);
  assert.doesNotMatch(
    JSON.stringify(result),
    /Ukryte hobby|Prywatny dziennik|Zwykła notatka|Nieznany typ|Espresso/,
  );
});

test("current gift ideas stay separate from wishes and confirmed previous gifts", () => {
  const [idea, wish, previous] = knowledge([
    row("idea", "gift", "Album"),
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

  const result = build([idea, wish, previous]);

  assert.deepEqual(result.giftIdeas.map((gift) => gift.value), ["Album"]);
  assert.deepEqual(result.sourceMemoryIds, ["idea"]);
  assert.equal(result.knownFactsCount, 1);
});

test("adapter output is deterministic and does not mutate input", () => {
  const items = knowledge([
    row("coffee", "coffee", "Flat White"),
    row("hobby", "hobby", "Fotografia"),
    row("memory", "memory", null, {
      content_text: "Spacer",
      occurred_on: "2026-07-08",
    }),
  ]);
  const snapshot = structuredClone(items);

  assert.deepEqual(build(items), build(items));
  assert.deepEqual(items, snapshot);
});

test("architecture keeps Semantic Memory below Brain and delegates the engine", async () => {
  const adapterUrl = new URL(
    "../src/lib/brain/brainSemanticMemoryAdapter.ts",
    import.meta.url,
  );
  const engineUrl = new URL(
    "../src/lib/brain/engines/personKnowledgeEngine.ts",
    import.meta.url,
  );
  const semanticDirectory = new URL("../src/lib/semantic-memory/", import.meta.url);
  const [adapterSource, engineSource, semanticFiles] = await Promise.all([
    readFile(adapterUrl, "utf8"),
    readFile(engineUrl, "utf8"),
    readdir(semanticDirectory),
  ]);
  const semanticSources = await Promise.all(
    semanticFiles
      .filter((name) => name.endsWith(".ts"))
      .map((name) => readFile(new URL(name, semanticDirectory), "utf8")),
  );

  assert.match(adapterSource, /from "\.\.\/semantic-memory\/index\.ts"/);
  assert.match(adapterSource, /buildSemanticMemoryProjection\(/);
  assert.match(engineSource, /from "\.\.\/brainSemanticMemoryAdapter\.ts"/);
  assert.match(engineSource, /buildPersonKnowledgeFromSemanticMemory\(input\)/);
  assert.equal(engineSource.includes("TYPE_TO_CATEGORY"), false);
  assert.equal(engineSource.includes("consumerStoredType"), false);
  assert.equal(
    semanticSources.some((source) =>
      /from\s+["'][^"']*(?:\/brain\/|\/brain["'])/.test(source)
    ),
    false,
  );
});
