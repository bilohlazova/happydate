import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { resolveChatPerson } from "../src/lib/chat-person/resolveChatPerson.ts";
import { shouldRunChatMemoryDetection } from "../src/lib/memory-capture/chatMemoryDetectionPrecheck.ts";
import { extractChatMemoryCandidateInputs } from "../src/lib/memory-capture/extractChatMemoryCandidateInputs.server.ts";
import { buildGiftRecommendationContext } from "../src/lib/gift-intelligence/index.ts";
import { buildMemoryCaptureCandidates } from "../src/lib/memory-capture/index.ts";

const root = process.cwd();

const people = [
  { id: "dima", name: "Діма Коваль", relation: "брат" },
  { id: "sergei", name: "Sergei Nowak", relation: "брат" },
  { id: "anna", name: "Anna Kowalska", relation: "żona" },
];

test("chat person resolver uses exact names, unambiguous first names and safe relation matching", () => {
  assert.deepEqual(resolveChatPerson({ userMessage: "Що подарувати Діма Коваль?", people }), {
    status: "resolved",
    personId: "dima",
    matchedBy: "name",
  });
  assert.deepEqual(resolveChatPerson({ userMessage: "діма любить мотоцикли", people }).personId, "dima");
  assert.deepEqual(resolveChatPerson({
    userMessage: "що для żona?",
    people,
  }), { status: "resolved", personId: "anna", matchedBy: "relation" });
  assert.deepEqual(resolveChatPerson({
    userMessage: "для брата",
    people,
  }), { status: "ambiguous", personId: null, matchedBy: "relation" });
  assert.deepEqual(resolveChatPerson({
    userMessage: "Діма",
    people,
  }).personId, "dima");
  assert.deepEqual(resolveChatPerson({
    userMessage: "Sergei любить Shoei",
    people,
    currentPersonId: "dima",
  }).personId, "sergei");
  assert.deepEqual(resolveChatPerson({
    userMessage: "Happy said Dima likes helmets",
    people: [],
  }), { status: "none", personId: null, matchedBy: null });
});

test("cheap chat memory pre-check avoids acknowledgements, names, budgets and lets explicit facts pass", () => {
  assert.equal(shouldRunChatMemoryDetection({ activePersonId: null, userMessage: "Діма любить мотоцикли" }), false);
  assert.equal(shouldRunChatMemoryDetection({ activePersonId: "dima", userMessage: "так" }), false);
  assert.equal(shouldRunChatMemoryDetection({ activePersonId: "dima", userMessage: "Діма", resolvedOnlyName: "Діма" }), false);
  assert.equal(shouldRunChatMemoryDetection({ activePersonId: "dima", userMessage: "Бюджет 500 zł" }), false);
  assert.equal(shouldRunChatMemoryDetection({ activePersonId: "dima", userMessage: "Діма любить мотоцикли" }), true);
  assert.equal(shouldRunChatMemoryDetection({ activePersonId: "dima", userMessage: "Він не любить отримувати одяг" }), true);
});

test("structured chat extractor accepts explicit facts and rejects inferred, uncertain or temporary values", async () => {
  assert.deepEqual(await extractChatMemoryCandidateInputs({
    userMessage: "Діма любить мотоцикли",
    locale: "uk",
  }), [{ type: "interest", value: "мотоцикли", confidence: "high", explicit: true }]);

  assert.deepEqual(await extractChatMemoryCandidateInputs({
    userMessage: "Йому подобається Shoei",
    locale: "uk",
  }), [{ type: "favorite_brand", value: "Shoei", confidence: "high", explicit: true }]);

  assert.deepEqual(await extractChatMemoryCandidateInputs({
    userMessage: "Він не любить отримувати одяг",
    locale: "uk",
  }), [{ type: "disliked_gift", value: "одяг", confidence: "high", explicit: true }]);

  assert.deepEqual(await extractChatMemoryCandidateInputs({ userMessage: "Бюджет 500 zł", locale: "uk" }), []);
  assert.deepEqual(await extractChatMemoryCandidateInputs({ userMessage: "Можливо, йому подобається спорт", locale: "uk" }), []);
  assert.deepEqual(await extractChatMemoryCandidateInputs({ userMessage: "Терміново треба подарунок завтра", locale: "uk" }), []);
});

test("chat candidates reuse existing builder, source and duplicate filtering", () => {
  const context = buildGiftRecommendationContext({
    person: { id: "dima", relationKey: "sibling", gender: "male", birthday: null },
    knowledge: [{
      id: "known",
      personId: "dima",
      kind: "preference",
      category: "interest",
      value: "кава",
      title: "interest",
      state: "confirmed",
      aiEligible: true,
    }],
    locale: "uk",
    currentDate: new Date("2026-07-23T10:00:00Z"),
  });

  const candidates = buildMemoryCaptureCandidates({
    context,
    aiResponseSource: "chat_message",
    aiResponse: {
      memoryCandidates: [
        { type: "interest", value: "мотоцикли", confidence: "high", explicit: true },
        { type: "interest", value: "кава", confidence: "high", explicit: true },
        { type: "budget", value: "500 zł", confidence: "high", explicit: true },
      ],
    },
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].source, "chat_message");
  assert.equal(candidates[0].value, "мотоцикли");
});

test("detect endpoint is authenticated, ownership-scoped, non-persistent and keeps chat streaming separate", async () => {
  const detectRoute = await readFile(path.join(root, "src/app/api/memory-capture/detect/route.ts"), "utf8");
  const chatRoute = await readFile(path.join(root, "src/app/api/ai-chat/route.ts"), "utf8");
  const modal = await readFile(path.join(root, "src/components/ChatAssistantModal.tsx"), "utf8");
  const confirmRoute = await readFile(path.join(root, "src/app/api/memory-capture/confirm/route.ts"), "utf8");

  assert.match(detectRoute, /resolveGiftAccess/);
  assert.match(detectRoute, /authenticateGiftRequest/);
  assert.match(detectRoute, /findOwnedGiftPerson/);
  assert.match(detectRoute, /loadGiftIntelligenceSource/);
  assert.match(detectRoute, /buildMemoryCaptureCandidates/);
  assert.match(detectRoute, /aiResponseSource: "chat_message"/);
  assert.doesNotMatch(detectRoute, /createKnowledge|createKnowledgeOnServer|\.insert\(|\.upsert\(|\.update\(/);
  assert.doesNotMatch(detectRoute, /\.from\("memories"\)/);

  assert.doesNotMatch(chatRoute, /memory-capture|MemoryCapture|candidate|JSON\.stringify\(\{[^}]*memory/);
  assert.match(modal, /\/api\/memory-capture\/detect/);
  assert.match(modal, /confirmMemoryCaptureCandidate/);
  assert.match(modal, /AbortController/);
  assert.match(modal, /memoryDetectionRequestRef/);
  assert.match(confirmRoute, /"chat_message"/);
});
