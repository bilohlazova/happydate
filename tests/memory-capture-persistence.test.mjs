import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  normalizeMemoryCaptureValue,
} from "../src/lib/memory-capture/index.ts";
import { authorizeGiftMemoryCandidates } from "../src/lib/memory-capture/authorizeGiftMemoryCandidates.server.ts";
import { verifyHappyLearningDetectionToken } from "../src/lib/happy-learning/happyLearningDetectionToken.server.ts";

const root = process.cwd();

function candidate(overrides = {}) {
  return {
    id: "memory-capture:person-1:interest:motorcycles",
    type: "interest",
    value: "Motorcycles",
    confidence: "high",
    source: "discovery_answer",
    requiresConfirmation: true,
    ...overrides,
  };
}

test("Gift candidates are converted to source-bound canonical signed candidates", () => {
  const secret = "gift-memory-candidate-test-secret";
  const [authorized] = authorizeGiftMemoryCandidates({
    userId: "user-1",
    person: { id: "person-1", name: "Ola" },
    knowledge: [],
    candidates: [candidate()],
    tokenSecret: secret,
    now: 1_700_000_000_000,
  });

  assert.equal(authorized.source, "gift_discovery");
  assert.equal(authorized.personId, "person-1");
  assert.equal(authorized.captureType, "interest");
  assert.equal(authorized.authorization, "detection_only");
  assert.equal(authorized.requiresConfirmation, true);
  const confirmation = {
    id: authorized.id,
    personId: authorized.personId,
    captureType: authorized.captureType,
    value: authorized.value,
    polarity: authorized.polarity,
    semanticTags: authorized.semanticTags,
    evidenceText: authorized.evidenceText,
    source: authorized.source,
    schemaVersion: authorized.schemaVersion,
  };
  assert.equal(verifyHappyLearningDetectionToken({
    token: authorized.detectionToken,
    candidate: confirmation,
    secret,
    now: 1_700_000_001_000,
  }).ok, true);
  assert.deepEqual(verifyHappyLearningDetectionToken({
    token: authorized.detectionToken,
    candidate: { ...confirmation, source: "chat_message" },
    secret,
    now: 1_700_000_001_000,
  }), { ok: false, error: "stale_candidate" });
});

test("normalization prevents case, punctuation and diacritic duplicates", () => {
  assert.equal(
    normalizeMemoryCaptureValue("  Café-bike!! "),
    normalizeMemoryCaptureValue("cafe bike"),
  );
});

test("Gift suggestions response signs canonical memory candidates without parsing prose", async () => {
  const route = await readFile(
    path.join(root, "src/app/api/ai/gift-suggestions/route.ts"),
    "utf8",
  );

  assert.match(route, /buildMemoryCaptureCandidates/);
  assert.match(route, /authorizeGiftMemoryCandidates/);
  assert.match(route, /HAPPY_LEARNING_TOKEN_SECRET/);
  assert.match(route, /discoveryAnswers: discoveryRequest\.answers/);
  assert.match(route, /context: giftRecommendationContext/);
  assert.match(route, /aiResponse: parsed/);
  assert.match(route, /memoryCandidates/);
  assert.doesNotMatch(route, /why\.match|title\.match|split\("likes"\)/);
});

test("Gift Workspace shows one canonical HappyLearningCard and preserves save, dismiss and retry behavior", async () => {
  const content = await readFile(
    path.join(root, "src/app/gift/start/StartPageContent.tsx"),
    "utf8",
  );

  assert.match(content, /HappyLearningCard/);
  assert.match(content, /visibleMemoryCandidates/);
  assert.match(content, /visibleMemoryCandidates\(recommendations\.memoryCandidates\)\[0\]/);
  assert.match(content, /confirmHappyLearningCandidateWithSession/);
  assert.doesNotMatch(content, /confirmMemoryCaptureCandidate/);
  assert.match(content, /setSavedMemoryCandidateIds/);
  assert.match(content, /setDismissedMemoryCandidateIds/);
  assert.match(content, /setMemoryCaptureStatus\(\{ kind: "saveFailed"/);
  assert.match(content, /setMemoryCaptureRetryNonce/);
  assert.match(content, /setDismissedMemoryCandidateIds\(\[\]\)/);
  assert.doesNotMatch(content, /\.from\(|\.insert\(|createKnowledge|KnowledgeRepository/);
});
