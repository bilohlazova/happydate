import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  applyGiftDiscoveryAnswersToContext,
  buildGiftDiscoverySession,
  normalizeGiftDiscoveryRequest,
} from "../src/lib/gift-discovery/index.ts";

const root = process.cwd();

function context(overrides = {}) {
  return {
    locale: "en",
    generatedAt: "2026-07-23T00:00:00.000Z",
    person: { id: "person-1", relationKey: null, gender: null, age: null },
    event: { id: null, category: null, date: null, daysUntil: null },
    budget: { amount: null, currency: null },
    season: "none",
    preferences: {
      likes: [],
      dislikes: [],
      interests: [],
      wishes: [],
      importantFacts: [],
    },
    knowledge: {
      interests: [],
      hobbies: [],
      favoriteBrands: [],
      dislikedGifts: [],
      preferredStyles: [],
    },
    memories: [],
    gifts: {
      active: [],
      previous: [],
      lifecycleCounts: { idea: 0, selected: 0, purchased: 0, given: 0 },
    },
    duplicateAvoidance: { previousGiftValues: [] },
    missingSignals: [
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
    ...overrides,
  };
}

test("every supported discovery answer is normalized to canonical values", () => {
  const result = normalizeGiftDiscoveryRequest({
    discoveryAnswers: {
      budget: "250.4",
      relationshipStrength: "close",
      interests: "  coffee   and books ",
      hobbies: " photography ",
      preferredStyle: "elegant",
      favoriteBrands: " Kindle ",
      dislikedGifts: " artificial flowers ",
      urgency: "thisWeek",
    },
  });

  assert.deepEqual(result.answers, {
    budget: 250,
    relationshipStrength: "close",
    interests: "coffee and books",
    hobbies: "photography",
    preferredStyle: "elegant",
    favoriteBrands: "Kindle",
    dislikedGifts: "artificial flowers",
    urgency: "thisWeek",
  });
  assert.deepEqual(result.answeredQuestions.map((item) => item.type), [
    "budget",
    "relationshipStrength",
    "interests",
    "hobbies",
    "dislikedGifts",
    "preferredStyle",
    "favoriteBrands",
    "urgency",
  ]);
});

test("invalid ids, invalid enums, invalid budgets and long text are handled safely", () => {
  const longText = `${"x".repeat(250)} end`;
  const result = normalizeGiftDiscoveryRequest({
    discoveryAnswers: {
      unknown: "bad",
      budget: -10,
      relationshipStrength: "translated-close",
      preferredStyle: "fancy",
      urgency: "soon",
      interests: longText,
      dislikedGifts: "y".repeat(350),
    },
    skippedDiscoveryQuestions: [
      "unknown:id",
      "missing_budget:budget",
      "missing_budget:budget",
      "relationshipStrength",
    ],
  });

  assert.equal(result.answers.budget, undefined);
  assert.equal(result.answers.relationshipStrength, undefined);
  assert.equal(result.answers.preferredStyle, undefined);
  assert.equal(result.answers.urgency, undefined);
  assert.equal(result.answers.interests?.length, 180);
  assert.equal(result.answers.dislikedGifts?.length, 300);
  assert.deepEqual(result.skippedQuestionIds, [
    "missing_budget:budget",
    "relationshipStrength",
  ]);
});

test("session answers enrich context without mutating the original and remove matching missing signals", () => {
  const original = context();
  const enriched = applyGiftDiscoveryAnswersToContext(original, {
    budget: 300,
    interests: "coffee",
    hobbies: "cycling",
    favoriteBrands: "Kindle",
    preferredStyle: "practical",
    dislikedGifts: "plastic flowers",
    relationshipStrength: "close",
    urgency: "flexible",
  });

  assert.equal(original.budget.amount, null);
  assert.deepEqual(original.preferences.interests, []);
  assert.equal(enriched.budget.amount, 300);
  assert.equal(enriched.budget.currency, "PLN");
  assert.deepEqual(enriched.preferences.interests, ["cycling", "coffee"]);
  assert.deepEqual(enriched.preferences.likes, ["Kindle"]);
  assert.deepEqual(enriched.preferences.wishes, ["practical"]);
  assert.deepEqual(enriched.preferences.dislikes, ["plastic flowers"]);
  assert.deepEqual(enriched.knowledge.interests, ["coffee"]);
  assert.deepEqual(enriched.knowledge.hobbies, ["cycling"]);
  assert.deepEqual(enriched.knowledge.favoriteBrands, ["Kindle"]);
  assert.deepEqual(enriched.knowledge.preferredStyles, ["practical"]);
  assert.deepEqual(enriched.knowledge.dislikedGifts, ["plastic flowers"]);
  assert.deepEqual(enriched.discoveryAnswers, {
    budget: 300,
    interests: "coffee",
    hobbies: "cycling",
    favoriteBrands: "Kindle",
    preferredStyle: "practical",
    dislikedGifts: "plastic flowers",
    relationshipStrength: "close",
    urgency: "flexible",
  });
  for (const removed of [
    "missing_budget",
    "missing_preferences",
    "missing_dislikes",
    "missing_relationship",
    "missing_event",
  ]) {
    assert.equal(enriched.missingSignals.includes(removed), false, removed);
  }
});

test("session answers take precedence while existing repository values are preserved", () => {
  const enriched = applyGiftDiscoveryAnswersToContext(context({
    budget: { amount: 100, currency: "EUR" },
    knowledge: {
      interests: ["Books"],
      hobbies: [],
      favoriteBrands: ["Coffee"],
      dislikedGifts: [],
      preferredStyles: [],
    },
    preferences: {
      likes: ["Coffee"],
      dislikes: ["Noise"],
      interests: ["Books"],
      wishes: [],
      importantFacts: [],
    },
    missingSignals: ["missing_budget", "missing_preferences"],
  }), {
    budget: 500,
    interests: "Books",
    favoriteBrands: "Kindle",
  });

  assert.deepEqual(enriched.budget, { amount: 500, currency: "EUR" });
  assert.deepEqual(enriched.preferences.interests, ["Books"]);
  assert.deepEqual(enriched.preferences.likes, ["Kindle", "Coffee"]);
  assert.deepEqual(enriched.knowledge.favoriteBrands, ["Kindle", "Coffee"]);
});

test("answered and skipped questions disappear, but skipped questions do not increase completion", () => {
  const base = context();
  const skippedOnly = buildGiftDiscoverySession({
    context: base,
    skippedQuestions: ["missing_budget:budget"],
  });
  const enriched = applyGiftDiscoveryAnswersToContext(base, { budget: 200 });
  const answered = buildGiftDiscoverySession({
    context: enriched,
    answeredQuestions: [{ type: "budget" }],
  });

  assert.equal(skippedOnly.remainingQuestions.some((item) => item.type === "budget"), false);
  assert.equal(skippedOnly.completionScore, buildGiftDiscoverySession({ context: base }).completionScore);
  assert.equal(answered.remainingQuestions.some((item) => item.type === "budget"), false);
  assert.ok(answered.completionScore > skippedOnly.completionScore);
  assert.equal(answered.nextRecommendedQuestion?.type, "relationshipStrength");
});

test("Gift API accepts discovery answers, bypasses session cache and returns discovery projection", async () => {
  const route = await readFile(
    path.join(root, "src/app/api/ai/gift-suggestions/route.ts"),
    "utf8",
  );

  assert.match(route, /discoveryAnswers\?: unknown/);
  assert.match(route, /skippedDiscoveryQuestions\?: unknown/);
  assert.match(route, /normalizeGiftDiscoveryRequest/);
  assert.match(route, /hasDiscoverySessionInput/);
  assert.match(route, /hasDiscoverySessionInput[\s\S]*\? null[\s\S]*: await getCachedGiftIdeas/);
  assert.match(route, /applyGiftDiscoveryAnswersToContext/);
  assert.match(route, /answeredQuestions: discoveryRequest\.answeredQuestions/);
  assert.match(route, /skippedQuestions: discoveryRequest\.skippedQuestionIds/);
  assert.match(route, /discovery: giftDiscoveryPromptInput/);
  assert.match(route, /if \(!hasDiscoverySessionInput\)[\s\S]*saveGiftIdeas/);
});

test("Gift Workspace keeps answer state, protects races, preserves failed refresh suggestions and supports reset", async () => {
  const content = await readFile(
    path.join(root, "src/app/gift/start/StartPageContent.tsx"),
    "utf8",
  );

  assert.match(content, /useState<GiftDiscoveryAnswers>\(\{\}\)/);
  assert.match(content, /useState<string\[\]>\(\[\]\)/);
  assert.match(content, /AbortController/);
  assert.match(content, /requestSequenceRef/);
  assert.match(content, /sequence !== requestSequenceRef\.current/);
  assert.match(content, /setRefreshError\(true\)/);
  assert.match(content, /setRecommendations\(previousRecommendations\)/);
  assert.match(content, /resetDiscoverySessionState/);
  assert.match(content, /setDiscoveryAnswers\(\{\}\)/);
  assert.match(content, /setSkippedDiscoveryQuestions\(\[\]\)/);
  assert.match(content, /discoveryAnswers: nextAnswers/);
  assert.match(content, /skippedDiscoveryQuestions: nextSkipped/);
});

test("request client sends discovery answers without breaking legacy response compatibility", async () => {
  const client = await readFile(
    path.join(root, "src/lib/gifts/giftRecommendationClient.ts"),
    "utf8",
  );
  assert.match(client, /discoveryAnswers\?: GiftDiscoveryAnswers/);
  assert.match(client, /skippedDiscoveryQuestions\?: string\[\]/);
  assert.match(client, /signal\?: AbortSignal/);
  assert.match(client, /discoveryAnswers: input\.discoveryAnswers/);
  assert.match(client, /skippedDiscoveryQuestions: input\.skippedDiscoveryQuestions/);
  assert.match(client, /ideas\?: unknown/);
  assert.match(client, /suggestions\?: unknown/);
});
