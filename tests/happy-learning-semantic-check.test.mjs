import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { checkHappyLearningSemanticStatus } from "../src/lib/happy-learning/checkHappyLearningSemanticStatus.server.ts";
import { buildSemanticMemoryProjection } from "../src/lib/semantic-memory/index.ts";

const ELIGIBLE = {
  statementStatus: "explicit",
  durability: "long_term",
  usefulness: "future_relevant",
  safety: "supported",
};

function knowledge(id, personId, value, overrides = {}) {
  return {
    id, personId, eventId: null, kind: "preference", category: "interest", polarity: null,
    title: null, value, occurredOn: null, importance: 0, tags: ["interest"], summary: null,
    state: "active", aiEligible: true, createdAt: "2026-01-01", updatedAt: null,
    legacyType: "interest",
    evidence: { sourceKind: "manual", sourceId: id, originalText: value, capturedAt: "2026-01-01" },
    classification: null, compatibility: { valueText: value, contentText: null }, ...overrides,
  };
}

function candidate(value, overrides = {}) {
  return {
    captureType: "interest", value, polarity: null, semanticTags: ["interest"], evidenceText: value,
    decision: ELIGIBLE, confidence: 0.5, ...overrides,
  };
}

function check(sourceKnowledge, nextCandidate, personId = "p1") {
  return checkHappyLearningSemanticStatus({
    personId,
    candidate: nextCandidate,
    knowledge: sourceKnowledge,
    semanticMemory: buildSemanticMemoryProjection({
      people: [{ id: personId }], knowledge: sourceKnowledge, currentDate: new Date(0),
    }),
  });
}

test("exact duplicate and compatible same-value facts are already known", () => {
  const source = [knowledge("known", "p1", "Fishing")];
  assert.deepEqual(check(source, candidate("fishing")), {
    status: "already_known", matchedKnowledgeIds: ["known"], conflictingKnowledgeIds: [], reason: "same_semantic_fact",
  });
  const liked = [knowledge("liked", "p1", "Coffee", { polarity: "likes", tags: ["like"] })];
  assert.equal(check(liked, candidate("coffee", { polarity: "likes", semanticTags: ["like"] })).reason, "same_value_same_polarity");
});

test("case, punctuation, whitespace and diacritics use canonical normalization", () => {
  const source = [knowledge("known", "p1", "  Wędkarstwo!  ")];
  assert.equal(check(source, candidate("wedkarstwo")).status, "already_known");
});

test("same value with incompatible tags or different semantic meaning stays new", () => {
  const source = [knowledge("color", "p1", "Blue", { category: "favorite_color", tags: ["favorite_color"] })];
  const result = check(source, candidate("Blue", { captureType: "interest", semanticTags: ["music"] }));
  assert.deepEqual(result, {
    status: "new", matchedKnowledgeIds: [], conflictingKnowledgeIds: [], reason: "no_match",
  });
});

test("opposite polarity is a conflict while same polarity is a duplicate", () => {
  const source = [knowledge("perfume", "p1", "Perfume", { polarity: "likes", tags: ["like", "lifestyle"] })];
  const conflict = check(source, candidate("perfume", {
    captureType: "dislike", polarity: "dislikes", semanticTags: ["dislike", "lifestyle"],
  }));
  assert.deepEqual(conflict, {
    status: "conflict", matchedKnowledgeIds: ["perfume"], conflictingKnowledgeIds: ["perfume"], reason: "opposite_polarity",
  });
  assert.equal(check(source, candidate("perfume", { polarity: "likes", semanticTags: ["like", "lifestyle"] })).status, "already_known");
});

test("exclusive favorite replacement is classified as conflict without fuzzy matching", () => {
  const source = [knowledge("blue", "p1", "Blue", { category: "favorite_color", tags: ["favorite_color"] })];
  const result = check(source, candidate("Red", { captureType: "favorite", semanticTags: ["favorite_color"] }));
  assert.deepEqual(result, {
    status: "conflict", matchedKnowledgeIds: ["blue"], conflictingKnowledgeIds: ["blue"], reason: "ambiguous_semantic_match",
  });
});

test("inactive and superseded sources do not suppress a new candidate", () => {
  for (const state of ["archived", "superseded", "proposed"]) {
    assert.equal(check([knowledge(state, "p1", "Fishing", { state })], candidate("Fishing")).status, "new");
  }
});

test("an existing conflicting fact remains conflict through source provenance", () => {
  const source = [
    knowledge("likes", "p1", "Tea", { polarity: "likes", tags: ["like", "favorite_food"] }),
    knowledge("dislikes", "p1", "Tea", { polarity: "dislikes", tags: ["dislike", "favorite_food"] }),
  ];
  const result = check(source, candidate("Tea", { polarity: "likes", semanticTags: ["like", "favorite_food"] }));
  assert.equal(result.status, "conflict");
  assert.deepEqual(result.matchedKnowledgeIds, ["dislikes", "likes"]);
  assert.deepEqual(result.conflictingKnowledgeIds, ["dislikes"]);
});

test("person scoping prevents equal values across people from matching", () => {
  const source = [knowledge("other", "p2", "Fishing")];
  assert.equal(check(source, candidate("Fishing"), "p1").status, "new");
});

test("multilingual equivalence is conservative and does not translate or fuzz values", () => {
  const source = [knowledge("uk", "p1", "рибалка")];
  assert.equal(check(source, candidate("fishing")).status, "new");
});

test("merged duplicate provenance returns every contributing source deterministically", () => {
  const source = [knowledge("b", "p1", "Fishing"), knowledge("a", "p1", "fishing")];
  const first = check(source, candidate("FISHING"));
  const second = check(source, candidate("FISHING"));
  assert.equal(first.status, "already_known");
  assert.deepEqual(first.matchedKnowledgeIds, ["a", "b"]);
  assert.deepEqual(second, first);
});

test("checker does not mutate candidate, Knowledge or Semantic Memory", () => {
  const source = [knowledge("known", "p1", "Fishing")];
  const next = candidate("fishing");
  const semanticMemory = buildSemanticMemoryProjection({ people: [{ id: "p1" }], knowledge: source, currentDate: new Date(0) });
  const before = structuredClone({ source, next, semanticMemory });
  checkHappyLearningSemanticStatus({ personId: "p1", candidate: next, knowledge: source, semanticMemory });
  assert.deepEqual({ source, next, semanticMemory }, before);
});

test("checker depends on Semantic Memory without reversing dependencies or writing data", async () => {
  const checker = await readFile(new URL("../src/lib/happy-learning/checkHappyLearningSemanticStatus.server.ts", import.meta.url), "utf8");
  const semanticFiles = await Promise.all([
    "index.ts", "semanticMemory.types.ts", "semanticMemoryTaxonomy.ts", "buildSemanticMemoryProjection.ts",
  ].map((file) => readFile(new URL(`../src/lib/semantic-memory/${file}`, import.meta.url), "utf8")));
  assert.match(checker, /semantic-memory/);
  assert.equal(semanticFiles.some((source) => source.includes("happy-learning")), false);
  for (const forbidden of [
    "react", "ChatAssistantModal", "MemoryCaptureCard", "repositories", "supabase",
    "createKnowledge", ".insert(", ".update(", ".upsert(", ".delete(",
  ]) assert.equal(checker.toLocaleLowerCase().includes(forbidden.toLocaleLowerCase()), false, forbidden);
});
