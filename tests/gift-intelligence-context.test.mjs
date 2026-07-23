import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGiftRecommendationContext } from "../src/lib/gift-intelligence/index.ts";

const now = new Date("2026-12-22T10:00:00.000Z");

function knowledge(overrides = {}) {
  return {
    id: "k-1",
    personId: "person-1",
    eventId: null,
    kind: "preference",
    category: "coffee",
    polarity: "likes",
    value: "Flat white",
    title: null,
    summary: null,
    occurredOn: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    state: "active",
    aiEligible: true,
    ...overrides,
  };
}

function gift(overrides = {}) {
  return {
    id: "gift-1",
    lifecycle: "idea",
    personId: "person-1",
    eventId: null,
    value: "Kindle",
    occurredOn: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    sourceKnowledgeId: "gift-1",
    ...overrides,
  };
}

test("complete Gift Intelligence context collects canonical person, event, knowledge, gifts, budget, season and locale", () => {
  const context = buildGiftRecommendationContext({
    locale: "uk",
    currentDate: now,
    person: {
      id: "person-1",
      relationKey: "sibling",
      gender: "male",
      birthday: "1996-02-10",
      relationship: "Brat",
    },
    event: {
      id: "event-1",
      category: "birthday",
      date: "2026-12-25",
      personId: "person-1",
    },
    budget: { amount: 250, currency: "pln" },
    knowledge: [
      knowledge({ id: "like", category: "coffee", polarity: "likes", value: "Flat white" }),
      knowledge({ id: "dislike", category: "food", polarity: "dislikes", value: "Spicy food" }),
      knowledge({ id: "interest", category: "book", polarity: "prefers", value: "Crime novels" }),
      knowledge({ id: "wish", kind: "wish", category: "gift", polarity: null, value: "Trip to Japan" }),
      knowledge({ id: "fact", kind: "fact", category: "important", polarity: null, value: "Works remotely" }),
      knowledge({ id: "memory", kind: "experience", category: "travel", polarity: null, value: "Zakopane trip", occurredOn: "2025-05-01" }),
    ],
    gifts: [
      gift({ id: "idea", lifecycle: "idea", value: "Coffee set" }),
      gift({ id: "selected", lifecycle: "selected", value: "Coffee set" }),
      gift({ id: "history", lifecycle: "given", value: "Board game", occurredOn: "2025-12-24" }),
    ],
  });

  assert.equal(context.locale, "uk");
  assert.equal(context.person.id, "person-1");
  assert.equal(context.person.relationKey, "sibling");
  assert.equal(context.person.gender, "male");
  assert.equal(context.person.age, 30);
  assert.deepEqual(context.event, {
    id: "event-1",
    category: "birthday",
    date: "2026-12-25",
    daysUntil: 3,
  });
  assert.deepEqual(context.budget, { amount: 250, currency: "PLN" });
  assert.equal(context.season, "christmas");
  assert.deepEqual(context.preferences.likes, ["Flat white"]);
  assert.deepEqual(context.preferences.dislikes, ["Spicy food"]);
  assert.deepEqual(context.preferences.interests, ["Crime novels"]);
  assert.deepEqual(context.preferences.wishes, ["Trip to Japan"]);
  assert.deepEqual(context.preferences.importantFacts, ["Works remotely"]);
  assert.deepEqual(context.memories.map((item) => item.value), ["Zakopane trip"]);
  assert.deepEqual(context.gifts.active.map((item) => item.value), ["Coffee set"]);
  assert.deepEqual(context.gifts.previous.map((item) => item.value), ["Board game"]);
  assert.deepEqual(context.duplicateAvoidance.previousGiftValues, ["Board game"]);
  assert.deepEqual(context.missingSignals, []);
});

test("missing information is exposed as missingSignals and never throws", () => {
  const context = buildGiftRecommendationContext({
    locale: "pl",
    currentDate: now,
    person: { id: "person-1", gender: "unspecified", birthday: null },
    knowledge: [],
    gifts: [],
  });

  assert.deepEqual(context.person, {
    id: "person-1",
    relationKey: null,
    gender: "unspecified",
    age: null,
  });
  assert.deepEqual(context.event, { id: null, category: null, date: null, daysUntil: null });
  assert.deepEqual(
    context.missingSignals,
    [
      "missing_event",
      "missing_relationship",
      "missing_gender",
      "missing_age",
      "missing_budget",
      "missing_preferences",
      "missing_dislikes",
      "missing_memories",
      "missing_previous_gifts",
    ],
  );
});

test("previous gifts are deduplicated and only given gifts enter duplicate avoidance", () => {
  const context = buildGiftRecommendationContext({
    locale: "en",
    currentDate: now,
    person: { id: "person-1", relationKey: "friend", gender: "female", birthday: "1990-01-01" },
    event: { id: "event-1", category: "anniversary", date: "2026-12-23" },
    budget: { amount: 100, currency: "eur" },
    gifts: [
      gift({ id: "given-new", lifecycle: "given", value: "Flowers", occurredOn: "2025-02-01" }),
      gift({ id: "given-old", lifecycle: "given", value: " flowers ", occurredOn: "2024-02-01" }),
      gift({ id: "active", lifecycle: "purchased", value: "Flowers" }),
    ],
  });

  assert.deepEqual(context.gifts.previous.map((item) => item.id), ["given-new"]);
  assert.deepEqual(context.duplicateAvoidance.previousGiftValues, ["Flowers"]);
  assert.deepEqual(context.gifts.active.map((item) => item.id), ["active"]);
  assert.equal(context.gifts.lifecycleCounts.given, 2);
});

test("context uses canonical values only and preserves user content without translation", () => {
  const context = buildGiftRecommendationContext({
    locale: "de",
    currentDate: new Date("2026-02-10T10:00:00.000Z"),
    person: { id: "person-1", relationKey: "partner", gender: "female", birthday: "1991-05-10", relationship: "Żona" },
    event: { id: "event-1", category: "birthday", date: "2026-02-14" },
    budget: { amount: 400, currency: "pln" },
    knowledge: [
      knowledge({ id: "custom", value: "Lubi kawę z kardamonem", polarity: "likes" }),
      knowledge({ id: "archived", value: "Archived value", state: "archived" }),
      knowledge({ id: "journal", kind: "journal", value: "Private journal" }),
      knowledge({ id: "other-person", personId: "person-2", value: "Other value" }),
    ],
  });

  assert.equal(context.locale, "de");
  assert.equal(context.season, "valentines_day");
  assert.equal(context.person.relationKey, "partner");
  assert.equal(context.budget.currency, "PLN");
  assert.deepEqual(context.preferences.likes, ["Lubi kawę z kardamonem"]);
  assert.equal(JSON.stringify(context).includes("Żona"), false);
  assert.equal(JSON.stringify(context).includes("Archived value"), false);
  assert.equal(JSON.stringify(context).includes("Private journal"), false);
  assert.equal(JSON.stringify(context).includes("Other value"), false);
});

test("Gift Intelligence foundation has no React or OpenAI dependency", async () => {
  const [builder, types] = await Promise.all([
    readFile(new URL("../src/lib/gift-intelligence/buildGiftRecommendationContext.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/gift-intelligence/giftIntelligence.types.ts", import.meta.url), "utf8"),
  ]);

  for (const forbidden of ["from \"react\"", "openai", "OpenAI", "chat.completions", "responses.create", "use client"]) {
    assert.equal(builder.includes(forbidden), false, forbidden);
    assert.equal(types.includes(forbidden), false, forbidden);
  }
});
