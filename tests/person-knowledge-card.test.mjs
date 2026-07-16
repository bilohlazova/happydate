import assert from "node:assert/strict";
import test from "node:test";

import {
  formatPersonKnowledgeDate,
  getPersonKnowledgeCardModel,
} from "../src/lib/people/personKnowledgePresentation.ts";

function knowledge(overrides = {}) {
  return {
    personId: "olek",
    personName: "Olek",
    interests: [],
    favoritePlaces: [],
    favoriteFood: [],
    favoriteDrinks: [],
    hobbies: [],
    books: [],
    movies: [],
    music: [],
    pets: [],
    perfumes: [],
    flowers: [],
    travel: [],
    sports: [],
    giftIdeas: [],
    memoriesCount: 0,
    latestMemoryDate: null,
    knownFactsCount: 0,
    completenessScore: 0,
    sourceMemoryIds: [],
    ...overrides,
  };
}

test("knowledge card model renders populated knowledge", () => {
  const model = getPersonKnowledgeCardModel(knowledge({ interests: ["Sztuka"], knownFactsCount: 1 }));
  assert.equal(model.hasKnowledge, true);
  assert.equal(model.chips[0].value, "Sztuka");
});

test("empty state is selected for an empty profile", () => {
  assert.equal(getPersonKnowledgeCardModel(knowledge()).hasKnowledge, false);
});

test("statistics use canonical knowledge counts", () => {
  const model = getPersonKnowledgeCardModel(knowledge({
    knownFactsCount: 4,
    giftIdeas: [{ memoryId: "gift", value: "Album", createdAt: null }],
    memoriesCount: 2,
  }));
  assert.deepEqual(
    [model.knownFactsCount, model.giftIdeasCount, model.memoriesCount],
    [4, 1, 2],
  );
});

test("profile score uses the engine output unchanged", () => {
  assert.equal(getPersonKnowledgeCardModel(knowledge({ completenessScore: 45 })).completenessScore, 45);
});

test("gift summary appears only when gifts exist", () => {
  assert.equal(getPersonKnowledgeCardModel(knowledge()).showGiftSummary, false);
  assert.equal(
    getPersonKnowledgeCardModel(knowledge({ giftIdeas: [{ memoryId: "g", value: "Secret", createdAt: null }] })).showGiftSummary,
    true,
  );
});

test("last memory appears only when count and date exist", () => {
  assert.equal(
    getPersonKnowledgeCardModel(knowledge({ memoriesCount: 1, latestMemoryDate: "2026-05-17T00:00:00.000Z" })).latestMemoryDateLabel,
    "17 maja 2026",
  );
  assert.equal(getPersonKnowledgeCardModel(knowledge({ latestMemoryDate: "2026-05-17T00:00:00.000Z" })).latestMemoryDateLabel, null);
  assert.equal(getPersonKnowledgeCardModel(knowledge({ memoriesCount: 1 })).latestMemoryDateLabel, null);
});

test("knowledge preview contains at most six chips", () => {
  const model = getPersonKnowledgeCardModel(knowledge({
    interests: ["1", "2", "3", "4", "5", "6", "7"],
    knownFactsCount: 7,
  }));
  assert.equal(model.chips.length, 6);
});

test("remaining indicator count is correct", () => {
  const model = getPersonKnowledgeCardModel(knowledge({
    interests: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    knownFactsCount: 9,
  }));
  assert.equal(model.remainingChipCount, 3);
});

test("journal text cannot enter the presentation model", () => {
  const privateJournal = "private journal text";
  const model = getPersonKnowledgeCardModel(knowledge({
    sourceMemoryIds: ["safe-memory"],
    interests: ["Fotografia"],
    knownFactsCount: 1,
  }));
  assert.equal(JSON.stringify(model).includes(privateJournal), false);
});

test("gift idea text is never included in chips or summary data", () => {
  const secretIdea = "Album fotograficzny";
  const model = getPersonKnowledgeCardModel(knowledge({
    giftIdeas: [{ memoryId: "gift", value: secretIdea, createdAt: null }],
    knownFactsCount: 1,
  }));
  assert.equal(JSON.stringify(model).includes(secretIdea), false);
  assert.deepEqual(model.chips, []);
});

test("duplicate chips are removed globally", () => {
  const model = getPersonKnowledgeCardModel(knowledge({
    interests: ["Flat White"],
    favoriteDrinks: [" flat   white "],
    knownFactsCount: 1,
  }));
  assert.deepEqual(model.chips.map((chip) => chip.value), ["Flat White"]);
});

test("manual Olek fixture produces safe preview and formatted date", () => {
  const model = getPersonKnowledgeCardModel(knowledge({
    favoriteDrinks: ["Flat White"],
    hobbies: ["Fotografia"],
    favoritePlaces: ["Ramen"],
    giftIdeas: [{ memoryId: "gift", value: "Album fotograficzny", createdAt: null }],
    memoriesCount: 1,
    latestMemoryDate: "2026-05-17T00:00:00.000Z",
    knownFactsCount: 4,
    completenessScore: 45,
  }));
  assert.deepEqual(model.chips.map((chip) => chip.value), ["Flat White", "Ramen", "Fotografia"]);
  assert.equal(model.giftIdeasCount, 1);
  assert.equal(model.latestMemoryDateLabel, "17 maja 2026");
  assert.equal(model.completenessScore, 45);
});

test("invalid memory date is not displayed", () => {
  assert.equal(formatPersonKnowledgeDate("not-a-date"), null);
});
