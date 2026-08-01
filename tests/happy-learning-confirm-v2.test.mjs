import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createHappyLearningConfirmV2Response } from "../src/lib/happy-learning/happyLearningConfirmV2.server.ts";
import { issueHappyLearningDetectionToken } from "../src/lib/happy-learning/happyLearningDetectionToken.server.ts";
import { mapHappyLearningCandidateToKnowledgeInput } from "../src/lib/happy-learning/mapHappyLearningCandidateToKnowledgeInput.ts";

const NOW = 1_700_000_000_000;
const SECRET = "confirm-v2-test-secret";
const candidate = {
  id: "happy-learning:abc",
  personId: "person-1",
  captureType: "interest",
  value: "Fishing",
  polarity: "likes",
  semanticTags: ["interest", "like"],
  evidenceText: "Ivan likes fishing",
  schemaVersion: "happy-learning-detection-v2",
};

function token(overrides = {}, options = {}) {
  return issueHappyLearningDetectionToken({ userId: options.userId ?? "user-1", candidate: { ...candidate, ...overrides }, secret: SECRET, now: options.now ?? NOW });
}

function request(candidateOverride = {}, tokenValue = token(candidateOverride)) {
  return new Request("http://localhost/api/memory-capture/confirm-v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer access" },
    body: JSON.stringify({ detectionToken: tokenValue, candidate: { ...candidate, ...candidateOverride } }),
  });
}

function knowledge(value, polarity = "likes") {
  return {
    id: "knowledge-1", personId: "person-1", eventId: null, kind: "preference", category: "interest", polarity,
    title: "interest", value, occurredOn: null, importance: 1, tags: [polarity === "dislikes" ? "dislike" : "like", "interest"], summary: null,
    state: "active", aiEligible: true, createdAt: "2026-01-01", updatedAt: null, legacyType: "interest",
    evidence: { sourceKind: "chat_message", sourceId: "knowledge-1", originalText: value, capturedAt: "2026-01-01" },
    classification: null, compatibility: { valueText: value, contentText: value },
  };
}

function deps(overrides = {}) {
  return {
    authenticate: async () => ({ userId: "user-1", accessToken: "access" }),
    findOwnedPerson: async (_auth, id) => id === "person-1" ? { id, name: "Ivan" } : null,
    loadKnowledge: async () => [],
    persist: async (input) => ({ id: `saved:${input.value}` }),
    tokenSecret: SECRET,
    now: NOW + 1_000,
    ...overrides,
  };
}

test("valid owned new candidate persists only token-bound user data", async () => {
  let saved;
  const response = await createHappyLearningConfirmV2Response(request(), deps({ persist: async (input) => { saved = input; return { id: "new-id" }; } }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, status: "created", knowledgeId: "new-id" });
  assert.deepEqual(saved, {
    userId: "user-1", personId: "person-1", legacyType: "interest", title: "interest", value: "Fishing",
    content: "Ivan likes fishing", source: "chat_message", importance: 1, aiTags: ["interest", "like"],
  });
});

test("all nine capture types map narrowly to canonical-compatible fields", () => {
  const expected = {
    preference: "preference", interest: "interest", hobby: "hobby", dislike: "preference",
    favorite: "preference", wish: "dream", personal_fact: "personal_fact", experience: "memory", gift_idea: "gift",
  };
  for (const [captureType, legacyType] of Object.entries(expected)) {
    const input = mapHappyLearningCandidateToKnowledgeInput({ userId: "user-1", candidate: { ...candidate, captureType } });
    assert.equal(input.legacyType, legacyType);
    assert.equal(input.userId, "user-1");
    assert.equal(input.personId, "person-1");
    assert.equal(input.source, "chat_message");
    assert.equal(input.value, candidate.value);
    assert.equal(input.content, candidate.evidenceText);
  }
});

test("invalid, expired, user-mismatched, person-mismatched and tampered tokens are rejected", async () => {
  const cases = [
    [request({}, "broken"), deps(), "invalid_token"],
    [request({}, token({}, { now: NOW - 700_000 })), deps(), "expired_token"],
    [request({}, token({}, { userId: "other" })), deps(), "invalid_token"],
    [request({ personId: "person-2" }, token({ personId: "person-2" })), deps(), "person_not_found"],
    [request({ value: "Books" }, token()), deps(), "stale_candidate"],
  ];
  for (const [req, dependencies, error] of cases) {
    const response = await createHappyLearningConfirmV2Response(req, dependencies);
    assert.equal((await response.json()).error, error);
  }
});

test("unknown types, tags and extra fields fail before persistence", async () => {
  let writes = 0;
  const dependencies = deps({ persist: async () => { writes += 1; return { id: "bad" }; } });
  for (const bodyCandidate of [
    { ...candidate, captureType: "budget" },
    { ...candidate, semanticTags: ["private_tag"] },
    { ...candidate, assistantText: "invented" },
  ]) {
    const response = await createHappyLearningConfirmV2Response(new Request("http://local", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ detectionToken: token(), candidate: bodyCandidate }),
    }), dependencies);
    assert.equal(response.status, 400);
  }
  assert.equal(writes, 0);
});

test("already known and repeated confirmation are deterministic and never duplicate", async () => {
  let writes = 0;
  let current = [];
  const dependencies = deps({
    loadKnowledge: async () => current,
    persist: async () => { writes += 1; current = [knowledge("Fishing")]; return { id: "created" }; },
  });
  assert.equal((await (await createHappyLearningConfirmV2Response(request(), dependencies)).json()).status, "created");
  assert.equal((await (await createHappyLearningConfirmV2Response(request(), dependencies)).json()).status, "already_known");
  assert.equal(writes, 1);
});

test("conflict and lost ownership do not persist", async () => {
  let writes = 0;
  const conflictCandidate = { polarity: "dislikes", semanticTags: ["interest", "dislike"] };
  const conflict = await createHappyLearningConfirmV2Response(request(conflictCandidate), deps({
    loadKnowledge: async () => [knowledge("Fishing", "likes")],
    persist: async () => { writes += 1; return { id: "no" }; },
  }));
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).error, "conflict");
  const lost = await createHappyLearningConfirmV2Response(request(), deps({ findOwnedPerson: async () => null }));
  assert.equal(lost.status, 404);
  assert.equal(writes, 0);
});

test("architecture keeps v1 and Gift flow unchanged while UI uses confirm-v2 safely", async () => {
  const [route, client, card, modal, semantic, v1] = await Promise.all([
    readFile("src/app/api/memory-capture/confirm-v2/route.ts", "utf8"),
    readFile("src/lib/happy-learning/happyLearningClient.ts", "utf8"),
    readFile("src/components/memory/HappyLearningCard.tsx", "utf8"),
    readFile("src/components/ChatAssistantModal.tsx", "utf8"),
    readFile("src/lib/semantic-memory/buildSemanticMemoryProjection.ts", "utf8"),
    readFile("src/app/api/memory-capture/confirm/route.ts", "utf8"),
  ]);
  assert.match(route, /createHappyLearningConfirmV2Response/);
  assert.match(client, /\/api\/memory-capture\/confirm-v2/);
  assert.match(card, /status === "saving"/);
  assert.match(card, /disabled=\{conflict \|\| status === "saving"/);
  assert.match(modal, /homeContext\.refresh\(\)/);
  assert.match(modal, /router\.refresh\(\)/);
  assert.doesNotMatch(semantic, /happy-learning/);
  assert.match(v1, /resolveGiftAccess/);
  assert.doesNotMatch(card, /supabase|\.from\(|\.insert\(/);
});
