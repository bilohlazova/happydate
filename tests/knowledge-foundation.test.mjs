import assert from "node:assert/strict";
import test from "node:test";

import {
  buildKnowledgeSnapshot,
  getAiEligibleKnowledge,
  getPersonKnowledge,
  mapLegacyMemoryToKnowledge,
  mapLegacyMemoryToCompatibilityDto,
  selectKnowledgeContext,
} from "../src/lib/knowledge/index.ts";

function memory(overrides = {}) {
  return {
    id: "memory-1",
    user_id: "user-1",
    person_id: "person-1",
    event_id: null,
    content_text: "Original content",
    audio_url: null,
    transcript_text: null,
    images: null,
    ai_summary: null,
    ai_tags: null,
    ai_emotional_score: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: null,
    type: "note",
    title: null,
    value_text: null,
    occurred_on: null,
    importance: 0,
    source: "manual",
    is_active: true,
    ...overrides,
  };
}

test("legacy preference becomes neutral canonical preference", () => {
  const item = mapLegacyMemoryToKnowledge(
    memory({ type: "coffee", value_text: "Speciality coffee" })
  );

  assert.equal(item.kind, "preference");
  assert.equal(item.category, "coffee");
  assert.equal(item.polarity, null);
  assert.equal(item.value, "Speciality coffee");
  assert.equal(item.legacyType, "coffee");
});

test("legacy gift remains an idea and is never presented as gift history", () => {
  const item = mapLegacyMemoryToKnowledge(
    memory({ type: "gift", value_text: "LEGO flowers" })
  );

  assert.equal(item.kind, "gift");
  assert.equal(item.category, "idea");
});

test("journal is private and excluded from AI eligibility", () => {
  const item = mapLegacyMemoryToKnowledge(memory({ type: "journal" }));

  assert.equal(item.kind, "journal");
  assert.equal(item.aiEligible, false);
  assert.deepEqual(getAiEligibleKnowledge([item]), []);
});

test("unknown legacy types stay traceable without invented semantics", () => {
  const item = mapLegacyMemoryToKnowledge(
    memory({ type: "Custom_Legacy", content_text: "Keep me" })
  );

  assert.equal(item.kind, "note");
  assert.equal(item.category, null);
  assert.equal(item.legacyType, "custom_legacy");
  assert.equal(item.evidence.originalText, "Keep me");
});

test("mapper does not mutate source arrays", () => {
  const tags = ["coffee"];
  const row = memory({ ai_tags: tags });
  const item = mapLegacyMemoryToKnowledge(row);

  item.tags.push("changed");
  assert.deepEqual(tags, ["coffee"]);
});

test("inactive records remain available but cannot enter AI context", () => {
  const item = mapLegacyMemoryToKnowledge(memory({ is_active: false }));

  assert.equal(item.state, "archived");
  assert.equal(item.aiEligible, false);
});

test("snapshot groups people, preserves unassigned items and sorts newest first", () => {
  const older = mapLegacyMemoryToKnowledge(
    memory({ id: "older", created_at: "2025-01-01T00:00:00.000Z" })
  );
  const newer = mapLegacyMemoryToKnowledge(
    memory({ id: "newer", type: "memory", occurred_on: "2026-02-01" })
  );
  const unassigned = mapLegacyMemoryToKnowledge(
    memory({ id: "free", person_id: null })
  );

  const snapshot = buildKnowledgeSnapshot([older, unassigned, newer]);
  const profile = getPersonKnowledge(snapshot, "person-1");

  assert.deepEqual(profile?.items.map((item) => item.id), ["newer", "older"]);
  assert.deepEqual(profile?.experiences.map((item) => item.id), ["newer"]);
  assert.deepEqual(snapshot.unassigned.map((item) => item.id), ["free"]);
  assert.equal(getPersonKnowledge(snapshot, "missing"), null);
});

test("legacy Brain compatibility projection preserves the previous shape", () => {
  const row = memory({
    type: "gift",
    title: "Gift",
    value_text: "LEGO",
    content_text: "For birthday",
    importance: 2,
  });

  assert.deepEqual(mapLegacyMemoryToCompatibilityDto(row), {
    id: "memory-1",
    personId: "person-1",
    type: "gift",
    title: "Gift",
    value: "LEGO",
    content: "For birthday",
    importance: 2,
    occurredOn: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    isActive: true,
    eventId: null,
  });
});

test("knowledge context applies person, privacy and bounded limit rules", () => {
  const first = mapLegacyMemoryToKnowledge(
    memory({ id: "first", person_id: "person-1" })
  );
  const second = mapLegacyMemoryToKnowledge(
    memory({ id: "second", person_id: "person-1", type: "memory" })
  );
  const other = mapLegacyMemoryToKnowledge(
    memory({ id: "other", person_id: "person-2" })
  );
  const journal = mapLegacyMemoryToKnowledge(
    memory({ id: "journal", person_id: "person-1", type: "journal" })
  );

  const selected = selectKnowledgeContext(
    [first, second, other, journal],
    { personIds: ["person-1"], limit: 1 }
  );

  assert.equal(selected.length, 1);
  assert.equal(selected[0]?.personId, "person-1");
  assert.notEqual(selected[0]?.kind, "journal");
});
