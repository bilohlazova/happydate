import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createHappyLearningDetectV2Response } from "../src/lib/happy-learning/happyLearningDetectV2.server.ts";
import { issueHappyLearningDetectionToken } from "../src/lib/happy-learning/happyLearningDetectionToken.server.ts";

const ELIGIBLE = {
  statementStatus: "explicit",
  durability: "long_term",
  usefulness: "future_relevant",
  safety: "supported",
};

function request(body, authenticated = true) {
  return new Request("http://localhost/api/memory-capture/detect-v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authenticated ? { Authorization: "Bearer test-token" } : {}),
    },
    body: JSON.stringify(body),
  });
}

function validBody(overrides = {}) {
  return { personId: "person-1", userMessage: "Ivan likes fishing", locale: "en", ...overrides };
}

function rawCandidate(value = "fishing", overrides = {}) {
  return {
    captureType: "interest",
    value,
    polarity: "likes",
    semanticTags: ["interest"],
    evidenceText: value,
    decision: ELIGIBLE,
    confidence: 0.4,
    ...overrides,
  };
}

function knownKnowledge(id, value, overrides = {}) {
  return {
    id, personId: "person-1", eventId: null, kind: "preference", category: "interest", polarity: null,
    title: null, value, occurredOn: null, importance: 0, tags: ["interest"], summary: null,
    state: "active", aiEligible: true, createdAt: "2026-01-01", updatedAt: null, legacyType: "interest",
    evidence: { sourceKind: "manual", sourceId: id, originalText: value, capturedAt: "2026-01-01" },
    classification: null, compatibility: { valueText: value, contentText: null }, ...overrides,
  };
}

function dependencies(overrides = {}) {
  return {
    authenticate: async (req) => req.headers.has("authorization")
      ? { userId: "user-1", accessToken: "test-token" }
      : null,
    findOwnedPerson: async (_auth, personId) => personId === "person-1"
      ? { id: "person-1", name: "Server Ivan" }
      : null,
    loadKnowledge: async () => [],
    provider: async () => ({ candidates: [rawCandidate()] }),
    issueDetectionToken: (userId, candidate) => issueHappyLearningDetectionToken({ userId, candidate, secret: "test-secret", now: 1_700_000_000_000 }),
    ...overrides,
  };
}

async function payload(response) {
  return response.json();
}

test("authenticated owned person receives a server-bound detection-only candidate", async () => {
  const response = await createHappyLearningDetectV2Response(request(validBody()), dependencies());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await payload(response);
  assert.equal(body.candidates.length, 1);
  assert.deepEqual(body.candidates[0], {
    ...rawCandidate(),
    id: body.candidates[0].id,
    personId: "person-1",
    personName: "Server Ivan",
    source: "chat_message",
    requiresConfirmation: true,
    schemaVersion: "happy-learning-detection-v2",
    authorization: "detection_only",
    semanticStatus: "new",
    detectionToken: body.candidates[0].detectionToken,
  });
  assert.match(body.candidates[0].id, /^happy-learning:[a-f0-9]{24}$/);
  assert.match(body.candidates[0].detectionToken, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
});

test("unauthenticated and missing or unowned people fail safely", async () => {
  const unauthorized = await createHappyLearningDetectV2Response(request(validBody(), false), dependencies());
  assert.equal(unauthorized.status, 401);
  assert.deepEqual(await payload(unauthorized), { candidates: [] });

  const missing = await createHappyLearningDetectV2Response(
    request(validBody({ personId: "not-owned" })),
    dependencies(),
  );
  assert.equal(missing.status, 404);
  assert.deepEqual(await payload(missing), { candidates: [] });
});

test("request accepts only personId, userMessage and a supported locale", async () => {
  let authenticated = false;
  const deps = dependencies({ authenticate: async () => {
    authenticated = true;
    return { userId: "user-1", accessToken: "test-token" };
  } });
  for (const body of [
    validBody({ locale: "fr" }),
    validBody({ userMessage: "x".repeat(1_001) }),
    { ...validBody(), personName: "Client Name" },
    { ...validBody(), conversation: [] },
  ]) {
    const response = await createHappyLearningDetectV2Response(request(body), deps);
    assert.equal(response.status, 400);
    assert.deepEqual(await payload(response), { candidates: [] });
  }
  assert.equal(authenticated, false);
});

test("negative precheck returns empty without calling provider", async () => {
  let providerCalls = 0;
  const response = await createHappyLearningDetectV2Response(
    request(validBody({ userMessage: "Maybe he likes fishing" })),
    dependencies({ provider: async () => {
      providerCalls += 1;
      return { candidates: [rawCandidate()] };
    } }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await payload(response), { candidates: [] });
  assert.equal(providerCalls, 0);
});

test("provider receives only foundation fields and server-resolved person name", async () => {
  let received;
  await createHappyLearningDetectV2Response(request(validBody()), dependencies({
    provider: async (input) => {
      received = input;
      return { candidates: [] };
    },
  }));
  assert.equal(received.resolvedPersonName, "Server Ivan");
  assert.equal(received.userMessage, "Ivan likes fishing");
  assert.deepEqual(Object.keys(received).sort(), [
    "allowedCaptureTypes", "allowedSemanticTags", "locale", "maxCandidates",
    "resolvedPersonName", "userMessage",
  ]);
  assert.equal(JSON.stringify(received).includes("person-1"), false);
});

test("server schema removes uncertain, question, temporary, sensitive and inferred output", async () => {
  const decisions = [
    { ...ELIGIBLE, statementStatus: "uncertain" },
    { ...ELIGIBLE, statementStatus: "question" },
    { ...ELIGIBLE, statementStatus: "inferred" },
    { ...ELIGIBLE, durability: "temporary" },
    { ...ELIGIBLE, safety: "sensitive" },
  ];
  const response = await createHappyLearningDetectV2Response(request(validBody()), dependencies({
    provider: async () => ({ candidates: decisions.map((decision) => rawCandidate("fishing", { decision })) }),
  }));
  assert.deepEqual(await payload(response), { candidates: [] });
});

test("detect-v2 suppresses known facts, returns conflicts and keeps new facts", async () => {
  const known = await createHappyLearningDetectV2Response(request(validBody()), dependencies({
    loadKnowledge: async () => [knownKnowledge("known-private-id", "Fishing")],
  }));
  assert.deepEqual(await payload(known), { candidates: [] });

  const conflict = await createHappyLearningDetectV2Response(request(validBody()), dependencies({
    provider: async () => ({ candidates: [rawCandidate("fishing", {
      captureType: "dislike", polarity: "dislikes", semanticTags: ["dislike", "interest"],
    })] }),
    loadKnowledge: async () => [knownKnowledge("conflict-private-id", "Fishing", {
      polarity: "likes", tags: ["like", "interest"],
    })],
  }));
  const conflictBody = await payload(conflict);
  assert.equal(conflictBody.candidates[0].semanticStatus, "conflict");
  assert.equal(JSON.stringify(conflictBody).includes("conflict-private-id"), false);

  const fresh = await payload(await createHappyLearningDetectV2Response(request(validBody()), dependencies()));
  assert.equal(fresh.candidates[0].semanticStatus, "new");
});

test("malformed output and provider failures or timeouts return an empty success", async () => {
  for (const provider of [
    async () => ({ candidates: "malformed" }),
    async () => { throw new Error("provider failed"); },
    async () => { throw new DOMException("timed out", "TimeoutError"); },
  ]) {
    const response = await createHappyLearningDetectV2Response(request(validBody()), dependencies({ provider }));
    assert.equal(response.status, 200);
    assert.deepEqual(await payload(response), { candidates: [] });
  }
});

test("responses are capped at three and deterministic", async () => {
  const provider = async () => ({ candidates: ["fishing", "coffee", "books", "music"].map((value) =>
    rawCandidate(value, { evidenceText: `Ivan likes fishing, coffee, books and music` }),
  ) });
  const body = validBody({ userMessage: "Ivan likes fishing, coffee, books and music" });
  const first = await payload(await createHappyLearningDetectV2Response(request(body), dependencies({ provider })));
  const second = await payload(await createHappyLearningDetectV2Response(request(body), dependencies({ provider })));
  assert.equal(first.candidates.length, 3);
  assert.deepEqual(second, first);
});

test("rate limit denial is bounded and provider is not called", async () => {
  let called = false;
  const response = await createHappyLearningDetectV2Response(request(validBody()), dependencies({
    checkRateLimit: async () => false,
    provider: async () => {
      called = true;
      return { candidates: [] };
    },
  }));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal(called, false);
});

test("detect-v2 has no persistence, Gift, UI, v1 mutation or personal-data logging dependency", async () => {
  const route = await readFile(new URL("../src/app/api/memory-capture/detect-v2/route.ts", import.meta.url), "utf8");
  const orchestration = await readFile(new URL("../src/lib/happy-learning/happyLearningDetectV2.server.ts", import.meta.url), "utf8");
  const provider = await readFile(new URL("../src/lib/happy-learning/openAiHappyLearningProvider.server.ts", import.meta.url), "utf8");
  const access = await readFile(new URL("../src/lib/happy-learning/happyLearningAccess.server.ts", import.meta.url), "utf8");
  const v1Detect = await readFile(new URL("../src/app/api/memory-capture/detect/route.ts", import.meta.url), "utf8");
  const v1Confirm = await readFile(new URL("../src/app/api/memory-capture/confirm/route.ts", import.meta.url), "utf8");
  const combined = `${route}\n${orchestration}\n${provider}\n${access}`;
  assert.match(route, /happy-learning/);
  for (const forbidden of [
    "GiftRecommendationContext", "gift-intelligence", "createKnowledge", ".insert(", ".upsert(", ".delete(",
    "ChatAssistantModal", "MemoryCaptureCard", "console.",
  ]) {
    assert.equal(combined.includes(forbidden), false, forbidden);
  }
  assert.match(v1Detect, /buildMemoryCaptureCandidates/);
  assert.match(v1Confirm, /mapMemoryCaptureCandidateToKnowledgeInput/);
  assert.equal(combined.includes("/app/api/"), false);
});
