import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildGiftDiscoveryFollowUpQuestions,
  buildGiftDiscoveryPromptInput,
  buildGiftDiscoverySession,
} from "../src/lib/gift-discovery/index.ts";

function context(overrides = {}) {
  return {
    locale: "uk",
    generatedAt: "2026-07-23T00:00:00.000Z",
    person: {
      id: "person-1",
      relationKey: null,
      gender: "unspecified",
      age: null,
    },
    event: {
      id: null,
      category: null,
      date: null,
      daysUntil: null,
    },
    budget: {
      amount: null,
      currency: null,
    },
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
    duplicateAvoidance: {
      previousGiftValues: [],
    },
    missingSignals: [
      "missing_event",
      "missing_relationship",
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

test("discovery questions are prioritized deterministically by recommendation impact", () => {
  const session = buildGiftDiscoverySession({
    context: context(),
    followUpQuestions: ["What is the budget?"],
  });
  assert.deepEqual(session.questions.map((question) => question.type), [
    "budget",
    "relationshipStrength",
    "interests",
    "dislikedGifts",
    "preferredStyle",
    "favoriteBrands",
    "hobbies",
    "urgency",
  ]);
  assert.equal(session.nextRecommendedQuestion?.type, "budget");
  assert.deepEqual(session.questions.map((question) => question.impact), [
    100,
    90,
    80,
    70,
    60,
    50,
    45,
    40,
  ]);
});

test("answered questions are removed and deduplicated", () => {
  const session = buildGiftDiscoverySession({
    context: context(),
    answeredQuestions: [
      { type: "budget", answeredAt: "2026-07-23T10:00:00.000Z" },
      { type: "budget", answeredAt: "2026-07-23T10:01:00.000Z" },
      { type: "interests" },
    ],
  });
  assert.deepEqual(session.answeredQuestions, [
    { type: "budget", answeredAt: "2026-07-23T10:00:00.000Z" },
    { type: "interests", answeredAt: null },
  ]);
  assert.equal(session.questions.some((question) => question.type === "budget"), false);
  assert.equal(session.questions.some((question) => question.type === "interests"), false);
  assert.equal(session.nextRecommendedQuestion?.type, "relationshipStrength");
});

test("question generation has no duplicates even with duplicate missing signals", () => {
  const session = buildGiftDiscoverySession({
    context: context({
      missingSignals: [
        "missing_budget",
        "missing_budget",
        "missing_preferences",
        "missing_preferences",
      ],
    }),
  });
  assert.deepEqual(session.missingSignals, ["missing_budget", "missing_preferences"]);
  assert.deepEqual(session.questions.map((question) => question.type), [
    "budget",
    "interests",
    "preferredStyle",
    "favoriteBrands",
    "hobbies",
  ]);
  assert.equal(new Set(session.questions.map((question) => question.id)).size, session.questions.length);
});

test("questions are not asked for information already present in context", () => {
  const session = buildGiftDiscoverySession({
    context: context({
      person: {
        id: "person-1",
        relationKey: "parent",
        gender: "female",
        age: 55,
      },
      event: {
        id: "event-1",
        category: "birthday",
        date: "2026-07-30",
        daysUntil: 7,
      },
      budget: { amount: 200, currency: "PLN" },
      preferences: {
        likes: ["coffee"],
        dislikes: ["synthetic flowers"],
        interests: ["travel"],
        wishes: [],
        importantFacts: [],
      },
      missingSignals: [
        "missing_budget",
        "missing_relationship",
        "missing_preferences",
        "missing_dislikes",
        "missing_event",
      ],
    }),
  });
  assert.deepEqual(session.questions, []);
  assert.equal(session.nextRecommendedQuestion, null);
});

test("completion score reflects context completeness", () => {
  const weak = buildGiftDiscoverySession({ context: context() });
  const strong = buildGiftDiscoverySession({
    context: context({ missingSignals: [] }),
  });
  const medium = buildGiftDiscoverySession({
    context: context({ missingSignals: ["missing_budget", "missing_preferences"] }),
  });

  assert.equal(strong.completionScore, 100);
  assert.ok(weak.completionScore < medium.completionScore);
  assert.ok(medium.completionScore < strong.completionScore);
  assert.equal(medium.completionScore, 65);
});

test("session preserves locale and creates a stable deterministic id", () => {
  const input = {
    context: context({ locale: "de" }),
    followUpQuestions: ["Wie hoch ist das Budget?"],
  };
  const first = buildGiftDiscoverySession(input);
  const second = buildGiftDiscoverySession(input);
  assert.equal(first.locale, "de");
  assert.equal(first.sessionId, second.sessionId);
  assert.match(first.sessionId, /^gift-discovery-/);
});

test("prompt input exposes only structured discovery projection", () => {
  const session = buildGiftDiscoverySession({ context: context({ locale: "en" }) });
  const promptInput = buildGiftDiscoveryPromptInput(session);
  assert.deepEqual(Object.keys(promptInput).sort(), [
    "answeredQuestions",
    "completionScore",
    "locale",
    "missingSignals",
    "nextRecommendedQuestion",
    "remainingQuestions",
  ].sort());
  assert.equal(promptInput.locale, "en");
  assert.equal(promptInput.nextRecommendedQuestion?.type, "budget");
});

test("follow-up questions are localized from remaining canonical questions only", () => {
  const session = buildGiftDiscoverySession({ context: context({ locale: "uk" }) });
  const questions = buildGiftDiscoveryFollowUpQuestions(session, [
    "unknown",
    "missing_preferences:interests",
    "missing_budget:budget",
    "missing_budget:budget",
    "missing_relationship:relationshipStrength",
    "missing_dislikes:dislikedGifts",
  ]);

  assert.deepEqual(questions, [
    "Який бюджет варто врахувати для цього подарунка?",
    "Наскільки близькі ваші стосунки?",
    "Які інтереси цієї людини зараз найважливіші?",
  ]);
});

test("follow-up questions fall back to deterministic priority when model output is invalid", () => {
  const session = buildGiftDiscoverySession({ context: context({ locale: "pl" }) });
  const questions = buildGiftDiscoveryFollowUpQuestions(session, ["not-in-session"]);
  assert.deepEqual(questions, [
    "Jaki budżet mam przyjąć na ten prezent?",
    "Jak bliska jest Wasza relacja?",
    "Jakie zainteresowania tej osoby są teraz najważniejsze?",
  ]);
});

test("discovery model uses canonical values only", () => {
  const session = buildGiftDiscoverySession({
    context: context(),
    followUpQuestions: ["Jaki jest budżet?"],
  });
  const serialized = JSON.stringify(session);
  assert.match(serialized, /missing_budget/);
  assert.match(serialized, /relationshipStrength/);
  assert.doesNotMatch(serialized, /Jaki jest budżet|What is the budget|Budżet|Relacja/);
  for (const question of session.questions) {
    assert.equal(question.id, `${question.sourceSignal}:${question.type}`);
  }
});

test("Gift Discovery foundation has no React, OpenAI or Supabase dependency", async () => {
  const files = [
    "../src/lib/gift-discovery/buildGiftDiscoverySession.ts",
    "../src/lib/gift-discovery/giftDiscoveryFollowUp.ts",
    "../src/lib/gift-discovery/giftDiscovery.types.ts",
    "../src/lib/gift-discovery/index.ts",
  ];
  const source = (
    await Promise.all(files.map((file) => readFile(new URL(file, import.meta.url), "utf8")))
  ).join("\n");
  for (const forbidden of [
    "react",
    "next-intl",
    "openai",
    "supabase",
    ".from(",
    "fetch(",
  ]) {
    assert.equal(source.toLowerCase().includes(forbidden), false, forbidden);
  }
});
