import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildGiftRecommendationContext,
  buildGiftRecommendationInstructions,
  buildGiftRepairInstructions,
} from "../src/lib/gift-intelligence/index.ts";
import { mapKnowledgeToGifts } from "../src/lib/gifts/gift.mapper.ts";

function knowledge(overrides = {}) {
  return {
    id: "k-1",
    personId: "person-1",
    eventId: null,
    kind: "preference",
    category: "coffee",
    polarity: "likes",
    title: null,
    value: "Flat white",
    occurredOn: null,
    importance: 0,
    tags: [],
    summary: null,
    state: "active",
    aiEligible: true,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: null,
    legacyType: "coffee",
    evidence: { sourceKind: "legacy", sourceId: "k-1", originalText: "Flat white", capturedAt: null },
    classification: null,
    compatibility: { valueText: "Flat white", contentText: null },
    ...overrides,
  };
}

test("Gift AI route uses GiftRecommendationContext as the single structured model payload", async () => {
  const route = await readFile(
    new URL("../src/app/api/ai/gift-suggestions/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(route, /buildGiftRecommendationContext\(\{/);
  assert.match(route, /input: JSON\.stringify\(context\)/);
  assert.match(route, /generateGiftRecommendations\(\s*giftRecommendationContext,/);
  assert.match(route, /instructions,/);
  assert.doesNotMatch(route, /buildGiftKnowledgeContext|formatGiftContextAsLegacyNotes|notesText/);
  assert.doesNotMatch(route, /Person: \$\{|Relation: \$\{|Notes:\s*\$\{/);
});

test("Gift AI route passes canonical context inputs and does not leak raw repository objects to OpenAI", async () => {
  const route = await readFile(
    new URL("../src/app/api/ai/gift-suggestions/route.ts", import.meta.url),
    "utf8",
  );
  const openAiStart = route.indexOf("openai.responses.create");
  const openAiEnd = route.indexOf("const output = ai.output_text", openAiStart);
  const openAiCall = route.slice(openAiStart, openAiEnd);

  for (const field of [
    "person:",
    "event:",
    "knowledge,",
    "gifts: mapKnowledgeToGifts(knowledge)",
    "budget:",
    "locale,",
  ]) {
    assert.match(route, new RegExp(field.replace(/[()]/g, "\\$&")));
  }

  assert.equal(openAiCall.includes("knowledge"), false);
  assert.equal(openAiCall.includes("person,"), false);
  assert.equal(openAiCall.includes("ownedPerson"), false);
  assert.equal(openAiCall.includes("mapKnowledgeToGifts"), false);
});

test("GiftRecommendationContext payload preserves locale, missingSignals, previous gifts and duplicateAvoidance", () => {
  const previous = knowledge({
    id: "given",
    kind: "gift",
    category: "given",
    value: "Kwiaty",
    occurredOn: "2025-05-01",
    classification: { userConfirmed: true },
    legacyType: "gift",
  });
  const context = buildGiftRecommendationContext({
    locale: "de",
    currentDate: new Date("2026-07-23T10:00:00.000Z"),
    person: {
      id: "person-1",
      relationKey: "sibling",
      gender: "female",
      birthday: "1995-01-01",
    },
    event: { id: null, category: "birthday", date: null, personId: "person-1" },
    knowledge: [
      knowledge({ id: "like", value: "Kawa", polarity: "likes" }),
      knowledge({ id: "memory", kind: "experience", category: "travel", value: "Wyjazd do Gdańska" }),
      previous,
    ],
    gifts: mapKnowledgeToGifts([previous]),
    budget: { amount: null, currency: null },
  });

  assert.equal(context.locale, "de");
  assert.deepEqual(context.preferences.likes, ["Kawa"]);
  assert.deepEqual(context.memories.map((item) => item.value), ["Wyjazd do Gdańska"]);
  assert.deepEqual(context.gifts.previous.map((item) => item.value), ["Kwiaty"]);
  assert.deepEqual(context.duplicateAvoidance.previousGiftValues, ["Kwiaty"]);
  assert.ok(context.missingSignals.includes("missing_budget"));
});

test("Gift AI instructions preserve duplicate avoidance and missing-data behavior", async () => {
  const instructions = buildGiftRecommendationInstructions({
    locale: "pl",
    generatedAt: "2026-07-23T00:00:00.000Z",
    person: { id: "person-1", relationKey: null, gender: null, age: null },
    event: { id: null, category: null, date: null, daysUntil: null },
    budget: { amount: null, currency: null },
    season: "none",
    preferences: { likes: [], dislikes: [], interests: [], wishes: [], importantFacts: [] },
    memories: [],
    gifts: {
      active: [],
      previous: [],
      lifecycleCounts: { idea: 0, selected: 0, purchased: 0, given: 0 },
    },
    duplicateAvoidance: { previousGiftValues: [] },
    missingSignals: ["missing_budget", "missing_preferences"],
  });
  const repairInstructions = buildGiftRepairInstructions();

  assert.match(instructions, /Do not invent missing facts/);
  assert.match(instructions, /missingSignals/);
  assert.match(instructions, /Avoid every value in duplicateAvoidance\.previousGiftValues/);
  assert.match(repairInstructions, /only repair attempt/);
});
