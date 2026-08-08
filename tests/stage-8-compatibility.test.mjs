import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("runtime memories access is confined to the canonical Knowledge Repository", async () => {
  const knowledge = await readFile(new URL("../src/lib/repositories/knowledgeRepository.ts", import.meta.url), "utf8");
  const compatibility = await readFile(new URL("../src/lib/repositories/memoryRepository.ts", import.meta.url), "utf8");
  assert.match(knowledge, /\.from\("memories"\)/);
  assert.doesNotMatch(compatibility, /\.from\("memories"\)/);
  for (const method of ["createKnowledge", "updateKnowledge", "deleteKnowledge", "listNotesKnowledgeProjection"]) {
    assert.match(compatibility, new RegExp(`\\b${method}\\b`));
  }

  const access = await readFile(new URL("../src/lib/happy-learning/happyLearningAccess.server.ts", import.meta.url), "utf8");
  const gift = await readFile(new URL("../src/lib/repositories/giftIntelligenceRepository.server.ts", import.meta.url), "utf8");
  assert.doesNotMatch(access, /\.from\("memories"\)/);
  assert.match(access, /listKnowledgeForOwnedPersonWithClient/);
  assert.doesNotMatch(gift, /\.from\("notes"\)|loadLegacyGiftNotes/);
});

test("Notes and manual capture preserve their fields through canonical CRUD adapters", async () => {
  const compatibility = await readFile(new URL("../src/lib/repositories/memoryRepository.ts", import.meta.url), "utf8");
  assert.match(compatibility, /legacyType: input\.type/);
  assert.match(compatibility, /title: input\.title/);
  assert.match(compatibility, /value: input\.valueText/);
  assert.match(compatibility, /content: input\.contentText/);
  assert.match(compatibility, /occurredOn: input\.occurredOn/);
  assert.match(compatibility, /images: input\.images === null \? null : images/);
  assert.match(compatibility, /source: "manual"/);
  const knowledge = await readFile(new URL("../src/lib/repositories/knowledgeRepository.ts", import.meta.url), "utf8");
  assert.match(knowledge, /listNotesKnowledgeProjection[\s\S]*includeArchived: true/);
});

test("authenticated Happy Learning knowledge read keeps explicit owner and person filters", async () => {
  const repository = await readFile(new URL("../src/lib/repositories/knowledgeRepository.ts", import.meta.url), "utf8");
  assert.match(repository, /listOwnedKnowledgeRowsWithClient/);
  assert.match(repository, /\.eq\("user_id", userId\)[\s\S]*\.eq\("person_id", personId\)/);
  assert.match(repository, /listKnowledgeForOwnedPersonWithClient/);
});

test("raw row readers and legacy Brain DTO are no longer public compatibility APIs", async () => {
  const [repository, compatibility, domain, mapper] = await Promise.all([
    readFile(new URL("../src/lib/repositories/knowledgeRepository.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/repositories/memoryRepository.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/knowledge/domain.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/knowledge/compatibilityMapper.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(repository, /export async function listKnowledgeRows\b/);
  assert.doesNotMatch(repository, /export async function listKnowledgeRowsForPerson\b/);
  assert.doesNotMatch(compatibility, /getActiveMemories|getMemoriesForPerson|getBrainMemories/);
  assert.doesNotMatch(`${domain}\n${mapper}`, /LegacyMemoryKnowledgeDto|mapLegacyMemoryToCompatibilityDto/);
});

test("local push dispatch migration version matches verified production history", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20260804161414_add_push_dispatch_claims.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /add column next_attempt_at timestamptz/);
  assert.match(migration, /add column provider_message_id text/);
  assert.match(migration, /reminder_deliveries_push_dispatch_idx/);
});

test("Gift AI cache is bounded, server-only and invalidated by canonical memory changes", async () => {
  const [migration, repository] = await Promise.all([
    readFile(new URL("../supabase/migrations/20260806172231_create_gift_ai_cache_with_memory_invalidation.sql", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/repositories/giftIntelligenceRepository.server.ts", import.meta.url), "utf8"),
  ]);

  assert.match(migration, /create table public\.ai_gift_cache/);
  assert.match(migration, /expires_at timestamptz not null/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.ai_gift_cache from anon, authenticated/);
  assert.match(migration, /after insert or update or delete on public\.memories/);
  assert.match(migration, /old\.person_id is distinct from new\.person_id/);
  assert.match(migration, /security definer[\s\S]*set search_path = ''/);
  assert.match(repository, /\.gt\("expires_at", new Date\(\)\.toISOString\(\)\)/);
  assert.match(repository, /Date\.now\(\) \+ 7 \* 24 \* 60 \* 60 \* 1000/);
});

test("retired compatibility entry points have no remaining production callers", async () => {
  const [manualCapture, notesAdapter, happyBrain] = await Promise.all([
    readFile(new URL("../src/app/care/add-memory/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/repositories/memoryRepository.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/happy/brain/loadBrain.ts", import.meta.url), "utf8"),
  ]);

  assert.match(manualCapture, /createKnowledge/);
  assert.doesNotMatch(manualCapture, /createMemory\b|memoryRepository/);
  assert.doesNotMatch(notesAdapter, /export (async )?function createMemory\b|CreateMemoryInput/);
  assert.doesNotMatch(happyBrain, /recentNotes/);
});
