import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { buildGiftDiscoverySession } from "../src/lib/gift-discovery/index.ts";
import { buildGiftRecommendationContext } from "../src/lib/gift-intelligence/index.ts";
import { mapSemanticMemoryToGiftContextProjection } from "../src/lib/gift-intelligence/giftSemanticMemoryAdapter.ts";
import { buildMemoryCaptureCandidates } from "../src/lib/memory-capture/index.ts";

function fact(overrides = {}) {
  return {
    id: "semantic-fact:person-1:coffee",
    personId: "person-1",
    value: "Coffee",
    normalizedValue: "coffee",
    tags: ["like"],
    score: 0.9,
    polarity: "likes",
    source: "manual",
    sourceKnowledgeIds: ["k-like"],
    firstSeenAt: "2026-07-01T00:00:00.000Z",
    lastSeenAt: "2026-07-01T00:00:00.000Z",
    userConfirmed: true,
    state: "active",
    ...overrides,
  };
}

function projection(overrides = {}) {
  return {
    personId: "person-1",
    facts: [],
    timeline: [],
    summary: {
      knownFactCount: 0,
      averageScore: 0,
      completenessScore: 0,
      updatedAt: null,
    },
    ...overrides,
  };
}

function knowledge(overrides = {}) {
  return {
    id: "k-1",
    personId: "person-1",
    eventId: null,
    kind: "preference",
    category: "interest",
    polarity: "likes",
    value: "Motorcycles",
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

const person = {
  id: "person-1",
  relationKey: "friend",
  gender: "male",
  birthday: "1990-01-01",
};

test("GiftSemanticMemoryAdapter maps semantic facts to the existing Gift context fields", () => {
  const result = mapSemanticMemoryToGiftContextProjection(projection({
    facts: [
      fact({ id: "like", value: "Coffee", normalizedValue: "coffee", tags: ["like"], sourceKnowledgeIds: ["like"] }),
      fact({ id: "dislike", value: "Plastic souvenirs", normalizedValue: "plastic souvenirs", tags: ["dislike"], polarity: "dislikes", sourceKnowledgeIds: ["dislike"] }),
      fact({ id: "interest", value: "Motorcycles", normalizedValue: "motorcycles", tags: ["interest", "vehicle"], sourceKnowledgeIds: ["interest"] }),
      fact({ id: "hobby", value: "Photography", normalizedValue: "photography", tags: ["hobby", "interest"], sourceKnowledgeIds: ["hobby"] }),
      fact({ id: "brand", value: "Garmin", normalizedValue: "garmin", tags: ["brand"], sourceKnowledgeIds: ["brand"] }),
      fact({ id: "failure", value: "Cheap socks", normalizedValue: "cheap socks", tags: ["gift_failure", "dislike"], polarity: "dislikes", sourceKnowledgeIds: ["failure"] }),
      fact({ id: "style", value: "Practical", normalizedValue: "practical", tags: ["preferred_style", "lifestyle"], sourceKnowledgeIds: ["style"] }),
      fact({ id: "wish", value: "Trip to Japan", normalizedValue: "trip to japan", tags: ["wishlist"], sourceKnowledgeIds: ["wish"] }),
      fact({ id: "fact", value: "Works remotely", normalizedValue: "works remotely", tags: ["important_fact"], sourceKnowledgeIds: ["fact"] }),
    ],
    timeline: [{
      id: "semantic-timeline:memory",
      personId: "person-1",
      kind: "memory",
      title: "Zakopane trip",
      date: "2025-05-01",
      sourceKnowledgeIds: ["memory"],
    }],
  }));

  assert.deepEqual(result.likes, ["Garmin", "Coffee"]);
  assert.deepEqual(result.dislikes, ["Plastic souvenirs", "Cheap socks"]);
  assert.deepEqual(result.interests, ["Photography", "Motorcycles"]);
  assert.deepEqual(result.wishes, ["Practical", "Trip to Japan"]);
  assert.deepEqual(result.importantFacts, ["Works remotely"]);
  assert.deepEqual(result.knowledge, {
    interests: ["Motorcycles"],
    hobbies: ["Photography"],
    favoriteBrands: ["Garmin"],
    dislikedGifts: ["Cheap socks"],
    preferredStyles: ["Practical"],
  });
  assert.deepEqual(result.memories, [{ id: "memory", value: "Zakopane trip", occurredOn: "2025-05-01" }]);
});

test("GiftSemanticMemoryAdapter deduplicates normalized multi-tag facts within each field", () => {
  const result = mapSemanticMemoryToGiftContextProjection(projection({
    facts: [
      fact({ id: "older", value: "Ducati", normalizedValue: "ducati", tags: ["brand", "vehicle", "technology", "interest"], sourceKnowledgeIds: ["older"], lastSeenAt: "2026-07-01T00:00:00.000Z" }),
      fact({ id: "newer", value: " ducati ", normalizedValue: "ducati", tags: ["brand", "interest"], sourceKnowledgeIds: ["newer"], lastSeenAt: "2026-07-10T00:00:00.000Z" }),
    ],
  }));

  assert.deepEqual(result.likes, ["ducati"]);
  assert.deepEqual(result.interests, ["ducati"]);
  assert.deepEqual(result.knowledge.favoriteBrands, ["ducati"]);
  assert.deepEqual(result.knowledge.interests, ["ducati"]);
});

test("GiftRecommendationContext is powered by semantic projection while preserving public shape and lifecycle", () => {
  const context = buildGiftRecommendationContext({
    locale: "uk",
    currentDate: new Date("2026-12-22T10:00:00.000Z"),
    person,
    event: { id: "event-1", category: "birthday", date: "2026-12-25", personId: "person-1" },
    budget: { amount: 250, currency: "pln" },
    knowledge: [
      knowledge({ id: "interest", category: "interest", value: "Motorcycles" }),
      knowledge({ id: "hobby", category: "hobby", polarity: null, value: "Photography" }),
      knowledge({ id: "brand", category: "general", title: "favorite_brand", polarity: null, value: "Garmin" }),
      knowledge({ id: "avoid", category: "general", title: "disliked_gift", polarity: null, value: "Plastic souvenirs" }),
      knowledge({ id: "style", category: "general", title: "preferred_style", polarity: null, value: "Practical" }),
      knowledge({ id: "wish", kind: "wish", category: "gift", polarity: null, value: "Trip to Japan" }),
      knowledge({ id: "fact", kind: "fact", category: "important", polarity: null, value: "Works remotely" }),
      knowledge({ id: "memory", kind: "experience", category: "travel", polarity: null, value: "Zakopane trip", occurredOn: "2025-05-01" }),
      knowledge({ id: "archived", title: "favorite_brand", value: "Archived", state: "archived" }),
      knowledge({ id: "journal", kind: "journal", value: "Private" }),
      knowledge({ id: "ineligible", value: "No AI", aiEligible: false }),
    ],
    gifts: [
      gift({ id: "active", lifecycle: "selected", value: "Coffee set" }),
      gift({ id: "history", lifecycle: "given", value: "Board game", occurredOn: "2025-12-24" }),
    ],
  });

  assert.deepEqual(Object.keys(context).sort(), [
    "budget",
    "duplicateAvoidance",
    "event",
    "generatedAt",
    "gifts",
    "outcomeLearning",
    "knowledge",
    "locale",
    "memories",
    "missingSignals",
    "person",
    "preferences",
    "season",
  ].sort());
  assert.deepEqual(context.knowledge, {
    interests: ["Motorcycles"],
    hobbies: ["Photography"],
    favoriteBrands: ["Garmin"],
    dislikedGifts: ["Plastic souvenirs"],
    preferredStyles: ["Practical"],
  });
  assert.deepEqual(context.memories.map((item) => item.value), ["Zakopane trip"]);
  assert.equal(JSON.stringify(context).includes("Archived"), false);
  assert.equal(JSON.stringify(context).includes("Private"), false);
  assert.equal(JSON.stringify(context).includes("No AI"), false);
  assert.deepEqual(context.gifts.active.map((item) => item.id), ["active"]);
  assert.deepEqual(context.gifts.previous.map((item) => item.id), ["history"]);
  assert.deepEqual(context.duplicateAvoidance.previousGiftValues, ["Board game"]);
});

test("semantic Gift context suppresses discovery questions for known facts", () => {
  const context = buildGiftRecommendationContext({
    locale: "en",
    currentDate: new Date("2026-12-22T10:00:00.000Z"),
    person,
    event: { id: "event-1", category: "birthday", date: "2026-12-25", personId: "person-1" },
    budget: { amount: 300, currency: "PLN" },
    knowledge: [
      knowledge({ id: "interest", category: "interest", value: "Motorcycles" }),
      knowledge({ id: "hobby", category: "hobby", polarity: null, value: "Photography" }),
      knowledge({ id: "brand", category: "general", title: "favorite_brand", polarity: null, value: "Garmin" }),
      knowledge({ id: "avoid", category: "general", title: "disliked_gift", polarity: null, value: "Plastic souvenirs" }),
      knowledge({ id: "style", category: "general", title: "preferred_style", polarity: null, value: "Practical" }),
      knowledge({ id: "memory", kind: "experience", category: "travel", polarity: null, value: "Zakopane trip", occurredOn: "2025-05-01" }),
    ],
    gifts: [gift({ id: "history", lifecycle: "given", value: "Board game" })],
  });

  const session = buildGiftDiscoverySession({ context });
  assert.deepEqual(
    session.remainingQuestions.map((question) => question.type),
    [],
  );
});

test("Memory Capture dedupe remains compatible with semantic Gift context", () => {
  const context = buildGiftRecommendationContext({
    locale: "uk",
    currentDate: new Date("2026-12-22T10:00:00.000Z"),
    person,
    knowledge: [
      knowledge({ id: "interest", category: "interest", value: "Motorcycles" }),
      knowledge({ id: "brand", category: "general", title: "favorite_brand", polarity: null, value: "Garmin" }),
      knowledge({ id: "avoid", category: "general", title: "disliked_gift", polarity: null, value: "Plastic souvenirs" }),
      knowledge({ id: "style", category: "general", title: "preferred_style", polarity: null, value: "Practical" }),
    ],
  });

  assert.deepEqual(
    buildMemoryCaptureCandidates({
      context,
      discoveryAnswers: {
        interests: "motorcycles",
        favoriteBrands: "garmin",
        dislikedGifts: "plastic souvenirs",
        preferredStyle: "practical",
      },
    }),
    [],
  );
});

test("Semantic Memory stays universal and Gift adapter is the explicit domain bridge", async () => {
  const root = new URL("../", import.meta.url);
  const semanticDir = path.join(root.pathname, "src/lib/semantic-memory");
  const semanticFiles = await readdir(semanticDir);
  for (const file of semanticFiles.filter((item) => item.endsWith(".ts"))) {
    const source = await readFile(path.join(semanticDir, file), "utf8");
    assert.doesNotMatch(source, /gift-intelligence|gift-discovery|\/gifts|assistant|brain|react|use client/i, file);
  }

  const adapter = await readFile(
    new URL("../src/lib/gift-intelligence/giftSemanticMemoryAdapter.ts", import.meta.url),
    "utf8",
  );
  assert.match(adapter, /PersonSemanticMemoryProjection/);
  assert.match(adapter, /GiftRecommendationContext/);

  const builder = await readFile(
    new URL("../src/lib/gift-intelligence/buildGiftRecommendationContext.ts", import.meta.url),
    "utf8",
  );
  assert.match(builder, /buildSemanticMemoryProjection/);
  assert.match(builder, /mapSemanticMemoryToGiftContextProjection/);
  assert.doesNotMatch(builder, /function classifyKnowledge/);
  assert.doesNotMatch(builder, /const INTEREST_CATEGORIES/);
});
