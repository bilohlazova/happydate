import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  mapMemoryCaptureCandidateToKnowledgeInput,
  normalizeMemoryCaptureCandidateValue,
  normalizeMemoryCaptureValue,
} from "../src/lib/memory-capture/index.ts";

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

test("each supported candidate maps to valid Knowledge input", () => {
  const cases = [
    ["interest", "interest", "interest"],
    ["hobby", "hobby", "hobby"],
    ["favorite_brand", "preference", "favorite_brand"],
    ["disliked_gift", "preference", "disliked_gift"],
    ["preferred_style", "preference", "preferred_style"],
  ];

  for (const [type, legacyType, title] of cases) {
    const result = mapMemoryCaptureCandidateToKnowledgeInput({
      userId: "user-1",
      personId: "person-1",
      candidate: candidate({ type, value: "  Aeropress  " }),
    });
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.input.userId, "user-1");
    assert.equal(result.ok && result.input.personId, "person-1");
    assert.equal(result.ok && result.input.legacyType, legacyType);
    assert.equal(result.ok && result.input.title, title);
    assert.equal(result.ok && result.input.value, "Aeropress");
    assert.equal(result.ok && result.input.content, "Aeropress");
    assert.equal(result.ok && result.input.source, "gift_discovery");
    assert.equal(result.ok && result.input.importance, 1);
  }
});

test("unsupported, empty, oversized and unconfirmed candidates are rejected", () => {
  assert.deepEqual(mapMemoryCaptureCandidateToKnowledgeInput({
    userId: "user-1",
    personId: "person-1",
    candidate: candidate({ type: "budget" }),
  }), { ok: false, error: "unsupported_type" });

  assert.deepEqual(mapMemoryCaptureCandidateToKnowledgeInput({
    userId: "user-1",
    personId: "person-1",
    candidate: candidate({ value: " " }),
  }), { ok: false, error: "invalid_value" });

  assert.deepEqual(mapMemoryCaptureCandidateToKnowledgeInput({
    userId: "user-1",
    personId: "person-1",
    candidate: candidate({ value: "x".repeat(121) }),
  }), { ok: false, error: "invalid_value" });

  assert.deepEqual(mapMemoryCaptureCandidateToKnowledgeInput({
    userId: "user-1",
    personId: "person-1",
    candidate: candidate({ requiresConfirmation: false }),
  }), { ok: false, error: "confirmation_required" });
});

test("normalization prevents case, punctuation and diacritic duplicates", () => {
  assert.equal(
    normalizeMemoryCaptureValue("  Café-bike!! "),
    normalizeMemoryCaptureValue("cafe bike"),
  );
  assert.equal(normalizeMemoryCaptureCandidateValue("  motorcycles  "), "motorcycles");
  assert.equal(normalizeMemoryCaptureCandidateValue("x".repeat(121)), null);
});

test("memory capture confirm API enforces auth, ownership, validation, duplicate protection and repository writes", async () => {
  const route = await readFile(
    path.join(root, "src/app/api/memory-capture/confirm/route.ts"),
    "utf8",
  );

  assert.match(route, /resolveGiftAccess/);
  assert.match(route, /authenticateGiftRequest/);
  assert.match(route, /findOwnedGiftPerson/);
  assert.match(route, /ALLOWED_CANDIDATE_KEYS/);
  assert.match(route, /requiresConfirmation !== true/);
  assert.match(route, /loadGiftIntelligenceSource/);
  assert.match(route, /alreadyExists/);
  assert.match(route, /status: "already_exists"/);
  assert.match(route, /mapMemoryCaptureCandidateToKnowledgeInput/);
  assert.match(route, /createKnowledgeOnServer/);
  assert.doesNotMatch(route, /\.insert\(/);
  assert.doesNotMatch(route, /\.from\("memories"\)/);
});

test("Gift suggestions response includes memory candidates from normalized context without parsing prose", async () => {
  const route = await readFile(
    path.join(root, "src/app/api/ai/gift-suggestions/route.ts"),
    "utf8",
  );

  assert.match(route, /buildMemoryCaptureCandidates/);
  assert.match(route, /discoveryAnswers: discoveryRequest\.answers/);
  assert.match(route, /context: giftRecommendationContext/);
  assert.match(route, /aiResponse: parsed/);
  assert.match(route, /memoryCandidates/);
  assert.doesNotMatch(route, /why\.match|title\.match|split\("likes"\)/);
});

test("Gift Workspace shows one MemoryCaptureCard and preserves save, dismiss and retry behavior", async () => {
  const content = await readFile(
    path.join(root, "src/app/gift/start/StartPageContent.tsx"),
    "utf8",
  );

  assert.match(content, /MemoryCaptureCard/);
  assert.match(content, /visibleMemoryCandidates/);
  assert.match(content, /visibleMemoryCandidates\(recommendations\.memoryCandidates\)\[0\]/);
  assert.match(content, /confirmMemoryCaptureCandidate/);
  assert.match(content, /setSavedMemoryCandidateIds/);
  assert.match(content, /setDismissedMemoryCandidateIds/);
  assert.match(content, /setMemoryCaptureStatus\(\{ kind: "saveFailed"/);
  assert.match(content, /setMemoryCaptureRetryNonce/);
  assert.match(content, /setDismissedMemoryCandidateIds\(\[\]\)/);
  assert.doesNotMatch(content, /supabase|\.from\(|createKnowledge|KnowledgeRepository/);
});

test("memory capture client preserves a narrow API contract and safe errors", async () => {
  const client = await readFile(
    path.join(root, "src/lib/memoryCaptureClient.ts"),
    "utf8",
  );

  assert.match(client, /\/api\/memory-capture\/confirm/);
  assert.match(client, /personId: input\.personId/);
  assert.match(client, /candidate: input\.candidate/);
  assert.match(client, /Bearer \$\{token\}/);
  assert.match(client, /unauthorized/);
  assert.match(client, /person_not_found/);
  assert.match(client, /invalid_candidate/);
  assert.match(client, /save_failed/);
});

test("budget, urgency and raw AI payloads are never persisted", async () => {
  const mapper = await readFile(
    path.join(root, "src/lib/memory-capture/mapMemoryCaptureCandidateToKnowledgeInput.ts"),
    "utf8",
  );
  const route = await readFile(
    path.join(root, "src/app/api/memory-capture/confirm/route.ts"),
    "utf8",
  );

  assert.doesNotMatch(mapper, /budget|urgency|prompt|chat|diagnostics|raw/i);
  assert.doesNotMatch(route, /prompt|chatHistory|diagnostics|budget|urgency/);
});
