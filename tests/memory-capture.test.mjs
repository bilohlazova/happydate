import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { buildMemoryCaptureCandidates } from "../src/lib/memory-capture/index.ts";

const root = process.cwd();

function context(overrides = {}) {
  return {
    locale: "en",
    generatedAt: "2026-07-23T00:00:00.000Z",
    person: { id: "person-1", relationKey: "brother", gender: "male", age: 31 },
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
    memories: [],
    gifts: {
      active: [],
      previous: [],
      lifecycleCounts: { idea: 0, selected: 0, purchased: 0, given: 0 },
    },
    duplicateAvoidance: { previousGiftValues: [] },
    missingSignals: [],
    ...overrides,
  };
}

test("explicit discovery answers produce canonical memory capture candidates", () => {
  const candidates = buildMemoryCaptureCandidates({
    context: context(),
    discoveryAnswers: {
      interests: "motorcycles",
      hobbies: "photography",
      favoriteBrands: "Garmin",
      dislikedGifts: "plastic souvenirs",
      preferredStyle: "practical",
    },
    aiResponse: { suggestions: [], followUpQuestions: [] },
  });

  assert.deepEqual(candidates.map((candidate) => ({
    type: candidate.type,
    value: candidate.value,
    confidence: candidate.confidence,
    source: candidate.source,
    requiresConfirmation: candidate.requiresConfirmation,
  })), [
    {
      type: "interest",
      value: "motorcycles",
      confidence: "high",
      source: "discovery_answer",
      requiresConfirmation: true,
    },
    {
      type: "hobby",
      value: "photography",
      confidence: "high",
      source: "discovery_answer",
      requiresConfirmation: true,
    },
    {
      type: "favorite_brand",
      value: "Garmin",
      confidence: "high",
      source: "discovery_answer",
      requiresConfirmation: true,
    },
    {
      type: "disliked_gift",
      value: "plastic souvenirs",
      confidence: "high",
      source: "discovery_answer",
      requiresConfirmation: true,
    },
    {
      type: "preferred_style",
      value: "practical",
      confidence: "high",
      source: "discovery_answer",
      requiresConfirmation: true,
    },
  ]);
  assert.ok(candidates.every((candidate) => candidate.id.startsWith("memory-capture:person-1:")));
});

test("explicit high-confidence AI response candidates are accepted without parsing suggestion prose", () => {
  const candidates = buildMemoryCaptureCandidates({
    context: context(),
    discoveryAnswers: {},
    aiResponse: {
      suggestions: [{
        title: "BMW cap",
        why: "He probably likes BMW and motorcycles.",
      }],
      followUpQuestions: [],
      memoryCandidates: [
        { type: "interest", value: "motorcycles", confidence: "high", explicit: true },
        { type: "favorite_brand", value: "BMW", confidence: "medium", explicit: true },
        { type: "hobby", value: "racing", confidence: "high", explicit: false },
      ],
    },
  });

  assert.deepEqual(candidates.map((candidate) => ({
    type: candidate.type,
    value: candidate.value,
    source: candidate.source,
  })), [
    { type: "interest", value: "motorcycles", source: "ai_response" },
  ]);
});

test("duplicates and already known values are filtered deterministically", () => {
  const candidates = buildMemoryCaptureCandidates({
    context: context({
      preferences: {
        likes: ["Garmin"],
        dislikes: ["Plastic souvenirs"],
        interests: ["Motorcycles"],
        wishes: ["elegant"],
        importantFacts: [],
      },
      gifts: {
        active: [{ id: "gift-1", lifecycle: "idea", value: "Coffee set" }],
        previous: [{ id: "gift-2", value: "Flowers", occurredOn: "2025-07-20" }],
        lifecycleCounts: { idea: 1, selected: 0, purchased: 0, given: 1 },
      },
    }),
    discoveryAnswers: {
      interests: "motorcycles",
      hobbies: "cycling",
      favoriteBrands: "garmin",
      dislikedGifts: "coffee-set",
      preferredStyle: "elegant",
    },
    aiResponse: {
      memoryCandidates: [
        { type: "hobby", value: "Cycling", confidence: "high", explicit: true },
        { type: "disliked_gift", value: "flowers", confidence: "high", explicit: true },
      ],
    },
  });

  assert.deepEqual(candidates.map((candidate) => ({
    type: candidate.type,
    value: candidate.value,
  })), [
    { type: "hobby", value: "cycling" },
  ]);
});

test("budget, urgency, temporary and inferred values are ignored", () => {
  const candidates = buildMemoryCaptureCandidates({
    context: context(),
    discoveryAnswers: {
      budget: 300,
      urgency: "thisWeek",
      relationshipStrength: "close",
    },
    aiResponse: {
      memoryCandidates: [
        { type: "budget", value: "300 PLN", confidence: "high", explicit: true },
        { type: "urgency", value: "this week", confidence: "high", explicit: true },
        { type: "interest", value: "maybe cars", confidence: "high", explicit: false },
        { type: "preferred_style", value: "emotional", confidence: "low", explicit: true },
      ],
    },
  });

  assert.deepEqual(candidates, []);
});

test("candidate output is canonical, bounded and does not mutate inputs", () => {
  const originalContext = context();
  const discoveryAnswers = { interests: ` ${"x".repeat(140)} ` };
  const candidates = buildMemoryCaptureCandidates({
    context: originalContext,
    discoveryAnswers,
    aiResponse: {
      memoryCandidates: [
        { type: "unknown", value: "bad", confidence: "high", explicit: true },
      ],
    },
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].type, "interest");
  assert.equal(candidates[0].value.length, 120);
  assert.equal(candidates[0].requiresConfirmation, true);
  assert.deepEqual(originalContext.preferences.interests, []);
  assert.equal(discoveryAnswers.interests.length, 142);
});

test("memory capture module stays independent from React, Supabase, OpenAI and next-intl", async () => {
  const directory = path.join(root, "src/lib/memory-capture");
  const files = await readdir(directory);
  for (const file of files.filter((item) => item.endsWith(".ts"))) {
    const content = await readFile(path.join(directory, file), "utf8");
    for (const forbidden of [
      "react",
      "@supabase/supabase-js",
      "supabaseClient",
      "openai",
      "next-intl",
      ".from(",
      "fetch(",
    ]) {
      assert.equal(content.includes(forbidden), false, `${file}: ${forbidden}`);
    }
  }
});
