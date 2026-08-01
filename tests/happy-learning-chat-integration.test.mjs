import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  parseHappyLearningDetectV2Response,
  requestHappyLearningDetection,
} from "../src/lib/happy-learning/happyLearningClient.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function validCandidate(overrides = {}) {
  return {
    id: "happy-learning:1234567890abcdef12345678",
    personId: "person-1",
    personName: "Iwan",
    captureType: "hobby",
    value: "wędkarstwo",
    polarity: "likes",
    semanticTags: ["hobby"],
    evidenceText: "lubi wędkarstwo",
    decision: {
      statementStatus: "explicit",
      durability: "long_term",
      usefulness: "future_relevant",
      safety: "supported",
    },
    confidence: 0.82,
    source: "chat_message",
    requiresConfirmation: true,
    schemaVersion: "happy-learning-detection-v2",
    authorization: "detection_only",
    semanticStatus: "new",
    detectionToken: "signed.payload",
    ...overrides,
  };
}

test("client parser accepts bounded new/conflict candidates and caps the UI at three", () => {
  const parsed = parseHappyLearningDetectV2Response({
    candidates: [
      validCandidate(),
      validCandidate({ id: "two", semanticStatus: "conflict", captureType: "dislike" }),
      validCandidate({ id: "three", captureType: "wish" }),
      validCandidate({ id: "four" }),
    ],
  });
  assert.equal(parsed.candidates.length, 3);
  assert.equal(parsed.candidates[1].semanticStatus, "conflict");
});

test("client parser rejects unsafe enums, malformed fields and oversized values", () => {
  const parsed = parseHappyLearningDetectV2Response({
    candidates: [
      validCandidate({ authorization: "write_allowed" }),
      validCandidate({ semanticTags: ["secret"] }),
      validCandidate({ value: "x".repeat(121) }),
      validCandidate({ personName: "" }),
    ],
  });
  assert.deepEqual(parsed, { candidates: [] });
});

test("v2 request sends only the approved body and treats failures as no candidates", async () => {
  let requestBody;
  const result = await requestHappyLearningDetection({
    personId: "person-1",
    userMessage: "Lubi wędkarstwo",
    locale: "pl",
    accessToken: "test-token",
    signal: new AbortController().signal,
  }, async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return new Response(JSON.stringify({ candidates: [validCandidate()] }), { status: 200 });
  });
  assert.deepEqual(requestBody, {
    personId: "person-1",
    userMessage: "Lubi wędkarstwo",
    locale: "pl",
  });
  assert.equal(result.candidates.length, 1);

  const failed = await requestHappyLearningDetection({
    personId: "person-1",
    userMessage: "Lubi wędkarstwo",
    locale: "pl",
    accessToken: "test-token",
    signal: new AbortController().signal,
  }, async () => { throw new Error("unavailable"); });
  assert.deepEqual(failed, { candidates: [] });
});

test("general chat starts v2 detection after person resolution without blocking chat streaming", async () => {
  const modal = await readFile(path.join(root, "src/components/ChatAssistantModal.tsx"), "utf8");
  const client = await readFile(path.join(root, "src/lib/happy-learning/happyLearningClient.ts"), "utf8");
  const card = await readFile(path.join(root, "src/components/memory/HappyLearningCard.tsx"), "utf8");
  const gift = await readFile(path.join(root, "src/app/gift/start/StartPageContent.tsx"), "utf8");
  const provider = await readFile(path.join(root, "src/lib/happy-learning/openAiHappyLearningProvider.server.ts"), "utf8");

  assert.match(client, /\/api\/memory-capture\/detect-v2/);
  assert.match(client, /personId: input\.personId[\s\S]*userMessage: input\.userMessage[\s\S]*locale: input\.locale/);
  assert.doesNotMatch(client, /supabase|createKnowledge|\.insert\(|\.upsert\(/);
  assert.ok(modal.indexOf("handlePotentialHappyLearning(content") < modal.indexOf("streamAssistantResponse(content"));
  assert.match(modal, /void detectHappyLearningCandidates/);
  assert.match(modal, /resolutionStatus !== "resolved"/);
  assert.match(modal, /candidate\.personId === input\.personId/);
  assert.match(card, /disabled=\{conflict \|\| status === "saving"/);
  assert.match(client, /confirmHappyLearningCandidate/);
  assert.match(gift, /MemoryCaptureCard/);
  assert.match(gift, /confirmMemoryCaptureCandidate/);
  assert.doesNotMatch(provider, /uniqueItems/);
});

test("new conversation, locale change and cancellation invalidate stale v2 results", async () => {
  const modal = await readFile(path.join(root, "src/components/ChatAssistantModal.tsx"), "utf8");
  assert.match(modal, /happyLearningAbortRef\.current\?\.abort\(\)/);
  assert.match(modal, /happyLearningRequestRef\.current \+= 1/);
  assert.match(modal, /input\.requestId !== happyLearningRequestRef\.current/);
  assert.match(modal, /setHappyLearning\(INITIAL_HAPPY_LEARNING_STATE\)/);
});

test("Happy Learning card renders below its message instead of being clipped in a horizontal row", async () => {
  const view = await readFile(path.join(root, "src/components/chat-assistant/ConversationView.tsx"), "utf8");
  assert.match(view, /className=\{`flex flex-col \$\{message\.role === "user" \? "items-end" : "items-start"\}`\}/);
  assert.match(view, /message\.id === happyLearning\.detectedForMessageId/);
  assert.doesNotMatch(view, /className=\{`flex \$\{message\.role === "user" \? "justify-end" : "justify-start"\}`\}/);
});
