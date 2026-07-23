import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildGiftKnowledgeContext,
  formatGiftContextAsLegacyNotes,
} from "../src/lib/gifts/giftKnowledgeContext.ts";
import { buildGiftRecommendationInstructions } from "../src/lib/gift-intelligence/index.ts";
import { mapLegacyMemoryToKnowledge } from "../src/lib/knowledge/compatibilityMapper.ts";
import { resolveGiftAccess } from "../src/lib/gifts/giftApiSecurity.ts";
import { mapOwnedGiftPersonRow } from "../src/lib/repositories/giftPersonMapper.ts";

function item(overrides = {}) {
  const row = {
    id: "knowledge-1", user_id: "user-1", person_id: "person-1", event_id: null,
    content_text: "Flat White", audio_url: null, transcript_text: null, images: null,
    ai_summary: null, ai_tags: null, ai_emotional_score: null,
    created_at: "2026-07-01T00:00:00.000Z", updated_at: null,
    type: "coffee", title: null, value_text: "Flat White", occurred_on: null,
    importance: 0, source: "manual", is_active: true,
  };
  return { ...mapLegacyMemoryToKnowledge(row), ...overrides };
}

test("legacy generic note and canonical note produce identical prompt context", () => {
  const knowledge = item({ kind: "note", legacyType: "note" });
  const canonicalText = formatGiftContextAsLegacyNotes(
    buildGiftKnowledgeContext("person-1", [knowledge]),
  );
  const legacyText = formatGiftContextAsLegacyNotes(
    buildGiftKnowledgeContext("person-1", []),
    ["Flat White"],
  );
  assert.equal(canonicalText, legacyText);
  assert.equal(canonicalText, "- Flat White");
});

test("likes, dislikes, wishes, hobbies, sizes and facts are classified", () => {
  const records = [
    item({ id: "like", polarity: "likes" }),
    item({ id: "dislike", polarity: "dislikes" }),
    item({ id: "wish", kind: "wish", category: "dream" }),
    item({ id: "hobby", category: "hobby" }),
    item({ id: "size", category: "size" }),
    item({ id: "fact", kind: "fact", category: "work" }),
  ];
  assert.deepEqual(
    buildGiftKnowledgeContext("person-1", records).facts.map((fact) => fact.section),
    ["likes", "dislikes", "wishes", "hobbies", "sizes", "importantFacts"],
  );
});

test("legacy gift is an idea and never becomes gift history", () => {
  const legacyGift = item({ kind: "gift", category: "idea", legacyType: "gift" });
  const confirmedHistory = item({ id: "history", kind: "gift", category: "history" });
  const sections = buildGiftKnowledgeContext("person-1", [legacyGift, confirmedHistory])
    .facts.map((fact) => fact.section);
  assert.deepEqual(sections, ["giftIdeas", "giftHistory"]);
});

test("journal, archived, AI-ineligible and other-person knowledge stay private", () => {
  const records = [
    item({ id: "journal", kind: "journal", aiEligible: false }),
    item({ id: "archived", state: "archived", aiEligible: false }),
    item({ id: "private", aiEligible: false }),
    item({ id: "other", personId: "person-2" }),
  ];
  assert.deepEqual(buildGiftKnowledgeContext("person-1", records).facts, []);
});

test("empty and missing-person contexts remain safe", () => {
  assert.deepEqual(buildGiftKnowledgeContext("missing", []), {
    personId: "missing",
    facts: [],
  });
  assert.equal(
    formatGiftContextAsLegacyNotes(buildGiftKnowledgeContext("missing", [])),
    "No notes provided.",
  );
});

test("production Gift AI has no direct Supabase or legacy model dependency", async () => {
  const route = await readFile(
    new URL("../src/app/api/ai/gift-suggestions/route.ts", import.meta.url),
    "utf8",
  );
  for (const forbidden of [
    "@supabase/supabase-js", "supabaseClient", ".from(\"notes\")",
    ".from(\"memories\")", "MemoryRow", "BrainMemory", "NotesMemoryRow",
  ]) assert.equal(route.includes(forbidden), false, forbidden);
  assert.match(route, /buildGiftRecommendationContext/);
  assert.match(route, /buildGiftDiscoverySession/);
  assert.match(route, /JSON\.stringify\(payload\)/);
  assert.doesNotMatch(route, /formatGiftContextAsLegacyNotes|notesText|Person: \$\{|Relation: \$\{/);
  assert.match(buildGiftRecommendationInstructions({
    locale: "pl",
    generatedAt: "2026-07-23T00:00:00.000Z",
    person: { id: "person-1", relationKey: null, gender: null, age: null },
    event: { id: null, category: null, date: null, daysUntil: null },
    budget: { amount: null, currency: null },
    season: "none",
    preferences: { likes: [], dislikes: [], interests: [], wishes: [], importantFacts: [] },
    knowledge: { interests: [], hobbies: [], favoriteBrands: [], dislikedGifts: [], preferredStyles: [] },
    memories: [],
    gifts: {
      active: [],
      previous: [],
      lifecycleCounts: { idea: 0, selected: 0, purchased: 0, given: 0 },
    },
    duplicateAvoidance: { previousGiftValues: [] },
    missingSignals: [],
  }), /structured AI payload: context and discovery/);
  assert.match(route, /model: "gpt-4\.1-mini"/);
  assert.match(route, /temperature: 0\.8/);
});

test("authenticated user can access an owned person", async () => {
  const result = await resolveGiftAccess(
    new Request("http://localhost", { headers: { authorization: "Bearer own" } }),
    "person-1",
    {
      authenticate: async () => "user-1",
      findOwnedPerson: async (userId, personId) => ({
        id: personId, userId, name: "Anna", relation: "Mama",
      }),
    },
  );
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.person.userId, "user-1");
});

test("owned gift person rows use current relation schema and canonical mapping", () => {
  const person = mapOwnedGiftPersonRow({
    id: "person-1",
    user_id: "user-1",
    name: "Dima",
    relationship: "Brat",
    relation_label: null,
    relation_key: null,
    gender: "male",
    birthday: "2026-08-03",
  });

  assert.deepEqual(person, {
    id: "person-1",
    userId: "user-1",
    name: "Dima",
    relation: "Brat",
    relationKey: "sibling",
    gender: "male",
    birthday: "2026-08-03",
  });
});

test("owned gift person mapping gives relation_label priority over relationship", () => {
  const person = mapOwnedGiftPersonRow({
    id: "person-1",
    user_id: "user-1",
    name: "Anna",
    relationship: "friend",
    relation_label: "Mama",
    relation_key: null,
    gender: null,
    birthday: null,
  });

  assert.equal(person.relation, "Mama");
  assert.equal(person.relationKey, "parent");
  assert.equal(person.gender, "unspecified");
});

test("another user's or invalid person is hidden with 404", async () => {
  const result = await resolveGiftAccess(new Request("http://localhost"), "foreign", {
    authenticate: async () => "user-1",
    findOwnedPerson: async () => null,
  });
  assert.deepEqual(result, { ok: false, status: 404, error: "person_not_found" });
});

test("owned person lookup failures are not converted into person_not_found", async () => {
  const lookupError = new Error("gift_person_lookup_failed");

  await assert.rejects(
    resolveGiftAccess(new Request("http://localhost"), "person-1", {
      authenticate: async () => "user-1",
      findOwnedPerson: async () => {
        throw lookupError;
      },
    }),
    (error) => error === lookupError,
  );
});

test("unauthenticated request is rejected before ownership or data reads", async () => {
  let ownershipCalls = 0;
  const result = await resolveGiftAccess(new Request("http://localhost"), "person-1", {
    authenticate: async () => null,
    findOwnedPerson: async () => {
      ownershipCalls += 1;
      return null;
    },
  });
  assert.deepEqual(result, { ok: false, status: 401, error: "unauthorized" });
  assert.equal(ownershipCalls, 0);
});

test("ownership verification precedes cache and every protected read", async () => {
  const route = await readFile(
    new URL("../src/app/api/ai/gift-suggestions/route.ts", import.meta.url), "utf8",
  );
  const access = route.indexOf("resolveGiftAccess(");
  assert.ok(access >= 0);
  for (const operation of [
    "getCachedGiftIdeas(", "loadGiftIntelligenceSource(",
    "saveGiftIdeas(",
  ]) assert.ok(route.indexOf(operation) > access, operation);
});

test("Knowledge and legacy Notes reads are user and person scoped", async () => {
  const [repository, knowledgeRepository] = await Promise.all([
    readFile(
    new URL("../src/lib/repositories/giftIntelligenceRepository.server.ts", import.meta.url),
    "utf8",
    ),
    readFile(
      new URL("../src/lib/repositories/knowledgeRepository.ts", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(repository, /select\("id, user_id, name, relationship, relation_label, relation_key, gender, birthday"\)/);
  assert.doesNotMatch(repository, /select\("id, user_id, name, relation,/);
  assert.match(repository, /const \{ data, error \}/);
  assert.match(repository, /throw new GiftIntelligenceRepositoryError\("gift_person_lookup_failed"/);
  assert.match(repository, /\.eq\("id", personId\)[\s\S]*?\.eq\("user_id", userId\)/);
  const knowledgeRead = repository.slice(repository.indexOf("loadGiftIntelligenceSource"));
  assert.match(knowledgeRead, /listKnowledgeForOwnedPersonOnServer/);
  assert.doesNotMatch(knowledgeRead, /\.from\("memories"\)/);
  assert.match(knowledgeRepository, /listKnowledgeRowsForOwnedPersonOnServer/);
  assert.match(knowledgeRepository, /\.eq\("user_id", userId\)[\s\S]*?\.eq\("person_id", personId\)/);
  const notesRead = repository.slice(repository.indexOf("loadLegacyGiftNotes"));
  assert.match(notesRead, /\.from\("notes"\)[\s\S]*?\.eq\("user_id", person\.userId\)[\s\S]*?\.eq\("person_id", person\.id\)/);
});

test("cache accepts only an ownership-verified person capability", async () => {
  const repository = await readFile(
    new URL("../src/lib/repositories/giftIntelligenceRepository.server.ts", import.meta.url),
    "utf8",
  );
  assert.match(repository, /getCachedGiftIdeas\(person: OwnedGiftPerson/);
  assert.match(repository, /saveGiftIdeas\([\s\S]*?person: OwnedGiftPerson/);
});
