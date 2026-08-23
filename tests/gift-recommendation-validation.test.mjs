import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGiftDiscoverySession } from "../src/lib/gift-discovery/index.ts";
import {
  buildGiftRecommendationInstructions,
  buildGiftRepairInstructions,
  mapSuggestionsToLegacyIdeas,
  validateGiftRecommendations,
} from "../src/lib/gift-intelligence/index.ts";

function context(overrides = {}) {
  return {
    locale: "uk",
    generatedAt: "2026-07-23T00:00:00.000Z",
    person: { id: "person-1", relationKey: "mother", gender: "female", age: 54 },
    event: { id: "event-1", category: "birthday", date: "2026-07-30", daysUntil: 7 },
    budget: { amount: 200, currency: "PLN" },
    season: "none",
    preferences: {
      likes: ["coffee", "books"],
      dislikes: ["artificial flowers"],
      interests: ["travel"],
      wishes: [],
      importantFacts: ["works remotely"],
    },
    knowledge: {
      interests: [],
      hobbies: [],
      favoriteBrands: [],
      dislikedGifts: [],
      preferredStyles: [],
    },
    memories: [{ id: "memory-1", value: "Trip to Gdańsk", occurredOn: "2026-05-01" }],
    gifts: {
      active: [{ id: "gift-active", lifecycle: "idea", value: "Coffee set" }],
      previous: [{ id: "gift-given", value: "Flowers", occurredOn: "2025-07-30" }],
      lifecycleCounts: { idea: 1, selected: 0, purchased: 0, given: 1 },
    },
    duplicateAvoidance: { previousGiftValues: ["Flowers"] },
    missingSignals: [],
    ...overrides,
  };
}

function response(suggestions, followUpQuestions = []) {
  return { suggestions, followUpQuestions };
}

function suggestion(overrides = {}) {
  return {
    title: "Coffee workshop",
    category: "experience",
    why: "Pasuje do zainteresowania kawą i nadchodzących urodzin.",
    confidence: "high",
    estimatedPrice: 180,
    currency: "PLN",
    personalizationSignals: ["event", "preference", "memory", "budget"],
    cautions: [],
    ...overrides,
  };
}

test("validated recommendations keep the personalized stable schema", () => {
  const result = validateGiftRecommendations(response([suggestion()]), context());
  assert.equal(result.suggestions.length, 1);
  assert.deepEqual(Object.keys(result.suggestions[0]).sort(), [
    "category",
    "cautions",
    "confidence",
    "currency",
    "estimatedPrice",
    "personalizationSignals",
    "title",
    "why",
  ].sort());
  assert.equal(result.suggestions[0].category, "experience");
  assert.equal(result.suggestions[0].confidence, "high");
  assert.deepEqual(result.suggestions[0].personalizationSignals, [
    "event",
    "preference",
    "memory",
    "budget",
  ]);
});

test("invalid enum values fall back to canonical confidence, category and signals", () => {
  const result = validateGiftRecommendations(response([
    suggestion({
      category: "luxury",
      confidence: "certain",
      personalizationSignals: ["preference", "database_id", "preference"],
      cautions: ["unknown", "verify_availability"],
    }),
  ]), context());
  assert.equal(result.suggestions[0].category, "other");
  assert.equal(result.suggestions[0].confidence, "low");
  assert.deepEqual(result.suggestions[0].personalizationSignals, ["preference"]);
  assert.deepEqual(result.suggestions[0].cautions, ["verify_availability"]);
});

test("previous given gifts are rejected with normalized case-insensitive matching", () => {
  const result = validateGiftRecommendations(response([
    suggestion({ title: "  flÓwers  " }),
    suggestion({ title: "Museum tickets", estimatedPrice: 100 }),
  ]), context());
  assert.deepEqual(result.suggestions.map((item) => item.title), ["Museum tickets"]);
  assert.equal(result.diagnostics.duplicateRejectedCount, 1);
  assert.match(result.validationErrors.join(","), /duplicate_blocked:flowers/);
});

test("active lifecycle gifts are rejected as duplicates", () => {
  const result = validateGiftRecommendations(response([
    suggestion({ title: "coffee SET" }),
    suggestion({ title: "Book subscription", estimatedPrice: 80 }),
  ]), context());
  assert.deepEqual(result.suggestions.map((item) => item.title), ["Book subscription"]);
  assert.equal(result.diagnostics.duplicateRejectedCount, 1);
});

test("duplicate recommendations inside one response are rejected", () => {
  const result = validateGiftRecommendations(response([
    suggestion({ title: "Photo book" }),
    suggestion({ title: "photo-book" }),
  ]), context());
  assert.deepEqual(result.suggestions.map((item) => item.title), ["Photo book"]);
  assert.equal(result.diagnostics.duplicateRejectedCount, 1);
  assert.match(result.validationErrors.join(","), /duplicate_response:photo book/);
});

test("budget validation removes clearly over-budget items and keeps uncertain prices cautious", () => {
  const result = validateGiftRecommendations(response([
    suggestion({ title: "Weekend abroad", estimatedPrice: 800 }),
    suggestion({ title: "Local tasting", estimatedPrice: null, cautions: [] }),
  ]), context());
  assert.deepEqual(result.suggestions.map((item) => item.title), ["Local tasting"]);
  assert.equal(result.diagnostics.budgetRejectedCount, 1);
  assert.ok(result.suggestions[0].cautions.includes("price_uncertain"));
});

test("missingSignals generate stable follow-up questions and cap high confidence", () => {
  const weakContext = context({
    budget: { amount: null, currency: null },
    missingSignals: ["missing_preferences", "missing_budget", "missing_age"],
  });
  const result = validateGiftRecommendations(response([
    suggestion({ confidence: "high" }),
  ], ["Jaki ma budżet?"]), weakContext);
  assert.equal(result.suggestions[0].confidence, "low");
  assert.deepEqual(result.followUpQuestions, [
    "question:missing_preferences",
    "question:missing_budget",
    "question:missing_age",
  ]);
  assert.ok(result.suggestions[0].cautions.includes("limited_context"));
});

test("partial success keeps valid recommendations after invalid suggestions", () => {
  const result = validateGiftRecommendations(response([
    { title: "", why: "", category: "book" },
    suggestion({ title: "Travel guide", estimatedPrice: 70 }),
  ]), context());
  assert.deepEqual(result.suggestions.map((item) => item.title), ["Travel guide"]);
  assert.match(result.validationErrors.join(","), /invalid_schema/);
});

test("compatibility mapper preserves current UI consumer fields", () => {
  const result = validateGiftRecommendations(response([
    suggestion({ title: "Travel guide", why: "Because travel is a known interest.", estimatedPrice: 70 }),
  ]), context());
  assert.deepEqual(mapSuggestionsToLegacyIdeas(result.suggestions), [{
    title: "Travel guide",
    explanation: "Because travel is a known interest.",
    why: "Because travel is a known interest.",
    price_range: "70 PLN",
  }]);
});

test("prompt contract forbids fabricated facts and preserves locale and canonical values", () => {
  const instructions = buildGiftRecommendationInstructions(context({
    locale: "de",
    missingSignals: ["missing_budget"],
  }));
  assert.match(instructions, /structured AI payload: context and discovery/);
  assert.match(instructions, /Do not invent missing facts/);
  assert.match(instructions, /Treat missingSignals as unknown information, not negative information/);
  assert.match(instructions, /strictly in context\.locale/);
  assert.match(instructions, /canonical/);
  assert.match(instructions, /missing_budget/);
});

test("discovery follow-up validation keeps only remaining questions in deterministic priority", () => {
  const weakContext = context({
    locale: "en",
    person: { id: "person-1", relationKey: null, gender: "female", age: 54 },
    budget: { amount: null, currency: null },
    preferences: {
      likes: [],
      dislikes: [],
      interests: [],
      wishes: [],
      importantFacts: [],
    },
    missingSignals: [
      "missing_budget",
      "missing_relationship",
      "missing_preferences",
      "missing_dislikes",
    ],
  });
  const discoverySession = buildGiftDiscoverySession({ context: weakContext });
  const result = validateGiftRecommendations(
    response([suggestion()], [
      "unknown-question",
      "missing_preferences:interests",
      "missing_budget:budget",
      "missing_budget:budget",
      "missing_dislikes:dislikedGifts",
      "missing_preferences:preferredStyle",
    ]),
    weakContext,
    { discoverySession },
  );

  assert.deepEqual(result.followUpQuestions, [
    "What budget should I use for this gift?",
    "Which interests matter most to this person right now?",
    "Which gifts should I avoid?",
  ]);
  assert.equal(result.diagnostics.completionScore, discoverySession.completionScore);
  assert.equal(result.diagnostics.remainingQuestionCount, discoverySession.remainingQuestions.length);
  assert.equal(result.diagnostics.answeredQuestionCount, 0);
  assert.equal(result.diagnostics.followUpQuestionCount, 3);
});

test("discovery follow-up validation excludes answered and known context questions", () => {
  const discoveryContext = context({
    locale: "de",
    person: { id: "person-1", relationKey: "mother", gender: "female", age: 54 },
    budget: { amount: 200, currency: "PLN" },
    preferences: {
      likes: [],
      dislikes: [],
      interests: [],
      wishes: [],
      importantFacts: [],
    },
    missingSignals: [
      "missing_budget",
      "missing_relationship",
      "missing_preferences",
      "missing_dislikes",
    ],
  });
  const discoverySession = buildGiftDiscoverySession({
    context: discoveryContext,
    answeredQuestions: [{ type: "interests" }],
  });
  const result = validateGiftRecommendations(
    response([suggestion()], [
      "missing_budget:budget",
      "missing_relationship:relationshipStrength",
      "missing_preferences:interests",
      "missing_dislikes:dislikedGifts",
    ]),
    discoveryContext,
    { discoverySession },
  );

  assert.deepEqual(result.followUpQuestions, [
    "Welche Geschenke sollte ich vermeiden?",
    "Welcher Geschenkstil passt am besten zu dieser Person?",
    "Hat diese Person Lieblingsmarken oder Lieblingsorte?",
  ]);
  assert.equal(result.followUpQuestions.some((question) => question.includes("Budget")), false);
  assert.equal(result.followUpQuestions.some((question) => question.includes("Beziehung")), false);
  assert.equal(result.diagnostics.locale, "de");
});

test("repair behavior is bounded to one server-side attempt", async () => {
  const repair = buildGiftRepairInstructions(context());
  const route = await readFile(
    new URL("../src/app/api/ai/gift-suggestions/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(repair, /only repair attempt/);
  assert.match(route, /buildGiftRepairInstructions\(giftRecommendationContext\)/);
  assert.match(repair, /strictly in uk/);
  assert.doesNotMatch(route, /while\s*\(/);
  assert.doesNotMatch(route, /for\s*\(\s*;\s*;\s*\)/);
  const result = validateGiftRecommendations(response([suggestion()]), context(), {
    repairAttempted: true,
  });
  assert.equal(result.diagnostics.repairAttempted, true);
});

test("diagnostics preserve locale without logging personal content", async () => {
  const result = validateGiftRecommendations(response([suggestion()]), context({ locale: "ru" }));
  assert.equal(result.diagnostics.locale, "ru");
  assert.equal(result.diagnostics.generatedCount, 1);
  assert.equal(JSON.stringify(result.diagnostics).includes("Trip to Gdańsk"), false);

  const route = await readFile(
    new URL("../src/app/api/ai/gift-suggestions/route.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(route, /console\.log\([\s\S]*giftRecommendationContext/);
  assert.doesNotMatch(route, /console\.log\([\s\S]*knowledge/);
});
