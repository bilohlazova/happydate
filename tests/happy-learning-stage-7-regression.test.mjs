import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { confirmHappyLearningCandidate } from "../src/lib/happy-learning/happyLearningClient.ts";
import { HAPPY_LEARNING_CAPTURE_TYPES } from "../src/lib/happy-learning/happyLearning.types.ts";
import { MEMORY_CAPTURE_ENDPOINTS } from "../src/lib/memory-capture/memoryCaptureEndpoints.ts";

const locales = ["pl", "uk", "en", "ru", "de"];

function candidate(overrides = {}) {
  return {
    id: "happy-learning:person-1:interest:coffee",
    personId: "person-1",
    personName: "Ola",
    captureType: "interest",
    value: "Coffee",
    polarity: "likes",
    semanticTags: ["interest", "like"],
    evidenceText: "Ola likes coffee",
    decision: {
      statementStatus: "explicit",
      durability: "long_term",
      usefulness: "future_relevant",
      safety: "supported",
    },
    confidence: 1,
    source: "chat_message",
    requiresConfirmation: true,
    schemaVersion: "happy-learning-detection-v2",
    authorization: "detection_only",
    semanticStatus: "new",
    detectionToken: "signed-token",
    ...overrides,
  };
}

function leafPaths(value, prefix = "") {
  return Object.entries(value).flatMap(([key, item]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return item && typeof item === "object" && !Array.isArray(item)
      ? leafPaths(item, path)
      : [path];
  });
}

test("all five locales have exact, non-empty canonical Memory Capture copy", async () => {
  const dictionaries = await Promise.all(locales.map(async (locale) => JSON.parse(
    await readFile(new URL(`../messages/${locale}/memoryCapture.json`, import.meta.url), "utf8"),
  )));
  const expectedPaths = leafPaths(dictionaries[0]);
  for (const [index, dictionary] of dictionaries.entries()) {
    assert.deepEqual(leafPaths(dictionary), expectedPaths, locales[index]);
    assert.deepEqual(Object.keys(dictionary), ["status", "learning"]);
    for (const captureType of HAPPY_LEARNING_CAPTURE_TYPES) {
      assert.equal(typeof dictionary.learning.labels[captureType], "string");
      assert.ok(dictionary.learning.labels[captureType].trim());
    }
    for (const value of Object.values(dictionary.learning)) {
      if (typeof value === "string") assert.ok(value.trim());
    }
  }
});

test("confirmation sends only token-bound fields to the stable canonical route", async () => {
  let request;
  const result = await confirmHappyLearningCandidate({
    candidate: candidate(),
    accessToken: "access-token",
  }, async (url, init) => {
    request = { url, init };
    return Response.json({ ok: true, status: "created", knowledgeId: "knowledge-1" });
  });

  assert.deepEqual(result, { ok: true, status: "created", knowledgeId: "knowledge-1" });
  assert.equal(request.url, MEMORY_CAPTURE_ENDPOINTS.canonical.confirm);
  assert.equal(request.init.headers.Authorization, "Bearer access-token");
  const body = JSON.parse(request.init.body);
  assert.deepEqual(Object.keys(body).sort(), ["candidate", "detectionToken"]);
  assert.deepEqual(Object.keys(body.candidate).sort(), [
    "captureType", "evidenceText", "id", "personId", "polarity", "schemaVersion",
    "semanticTags", "source", "value",
  ]);
  for (const forbidden of ["personName", "decision", "confidence", "authorization", "semanticStatus"]) {
    assert.equal(forbidden in body.candidate, false, forbidden);
  }
});

test("client fails closed on transport errors and unknown server payloads", async () => {
  const unavailable = await confirmHappyLearningCandidate({
    candidate: candidate(),
    accessToken: "access-token",
  }, async () => { throw new Error("network unavailable"); });
  assert.deepEqual(unavailable, { ok: false, error: "save_failed" });

  const malformed = await confirmHappyLearningCandidate({
    candidate: candidate(),
    accessToken: "access-token",
  }, async () => Response.json({ ok: true, status: "invented", debug: "private" }));
  assert.deepEqual(malformed, { ok: false, error: "save_failed" });
});

test("runtime has one Memory Capture route pair and no legacy persistence client", async () => {
  const [endpoints, gift, chat] = await Promise.all([
    readFile(new URL("../src/lib/memory-capture/memoryCaptureEndpoints.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/gift/start/StartPageContent.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/ChatAssistantModal.tsx", import.meta.url), "utf8"),
  ]);
  const combined = `${endpoints}\n${gift}\n${chat}`;
  assert.doesNotMatch(combined, /detect-v2|confirm-v2|legacyGift|confirmMemoryCaptureCandidate/);
  assert.doesNotMatch(gift, /\.from\(|\.insert\(|createKnowledge/);
  assert.match(gift, /confirmHappyLearningCandidateWithSession/);
  assert.match(chat, /requestHappyLearningDetection/);
});
