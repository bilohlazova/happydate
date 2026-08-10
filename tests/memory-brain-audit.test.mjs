import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Memory Brain audit mutations are owner, person and active-row scoped", async () => {
  const [repository, loaders] = await Promise.all([
    read("src/lib/repositories/knowledgeRepository.ts"),
    read("src/lib/people/people.loaders.ts"),
  ]);

  for (const operation of ["updateOwnedPersonKnowledgeValue", "archiveOwnedPersonKnowledge"]) {
    assert.match(repository, new RegExp(`export async function ${operation}`));
  }
  assert.match(repository, /updateOwnedPersonKnowledgeValue[\s\S]*\.eq\("user_id", authenticatedUserId\)[\s\S]*\.eq\("person_id", input\.personId\)[\s\S]*\.eq\("is_active", true\)/);
  assert.match(repository, /archiveOwnedPersonKnowledge[\s\S]*\.eq\("user_id", authenticatedUserId\)[\s\S]*\.eq\("person_id", input\.personId\)[\s\S]*\.eq\("is_active", true\)/);
  assert.match(loaders, /authenticatedUserId\(\)[\s\S]*updateOwnedPersonKnowledgeValue/);
  assert.match(loaders, /authenticatedUserId\(\)[\s\S]*archiveOwnedPersonKnowledge/);
});

test("Memory Brain corrections preserve immutable source provenance", async () => {
  const repository = await read("src/lib/repositories/knowledgeRepository.ts");
  const correction = repository.slice(
    repository.indexOf("export async function updateOwnedPersonKnowledgeValue"),
    repository.indexOf("export async function archiveOwnedPersonKnowledge"),
  );
  assert.match(correction, /value_text: value/);
  for (const immutable of ["source_record_id", "source_excerpt", "user_confirmed_at", "capture_schema_version"]) {
    assert.equal(correction.includes(`${immutable}:`), false, immutable);
  }
});

test("Person Profile exposes provenance, correction and reversible archive semantics", async () => {
  const [profile, types] = await Promise.all([
    read("src/components/people/PersonProfileContent.tsx"),
    read("src/lib/people/peopleData.types.ts"),
  ]);
  assert.match(types, /sourceExcerpt: string \| null/);
  assert.match(types, /capturedAt: string \| null/);
  assert.match(profile, /item\.sourceExcerpt/);
  assert.match(profile, /changePersonKnowledgeValue/);
  assert.match(profile, /archivePersonKnowledge/);
  assert.match(profile, /archiveExplanation/);
  assert.doesNotMatch(profile, /deleteKnowledge/);
});

test("Memory Brain audit copy exists in every supported Person locale", async () => {
  for (const locale of ["uk", "en", "pl", "ru", "de"]) {
    const messages = JSON.parse(await read(`messages/${locale}/person.json`));
    const audit = messages.profileUi.knowledgeAudit;
    for (const key of ["showDetails", "excerpt", "edit", "save", "archive", "confirmArchive", "archiveExplanation", "error"]) {
      assert.equal(typeof audit[key], "string", `${locale}.${key}`);
      assert.ok(audit[key].trim(), `${locale}.${key}`);
    }
  }
});

test("archive restore and permanent deletion have separate guarded boundaries", async () => {
  const [repository, loaders, profile] = await Promise.all([
    read("src/lib/repositories/knowledgeRepository.ts"),
    read("src/lib/people/people.loaders.ts"),
    read("src/components/people/PersonProfileContent.tsx"),
  ]);
  assert.match(repository, /restoreOwnedPersonKnowledge[\s\S]*\.eq\("user_id", authenticatedUserId\)[\s\S]*\.eq\("person_id", input\.personId\)[\s\S]*\.eq\("is_active", false\)/);
  assert.match(repository, /deleteArchivedOwnedPersonKnowledge[\s\S]*\.delete\(\)[\s\S]*\.eq\("user_id", authenticatedUserId\)[\s\S]*\.eq\("person_id", input\.personId\)[\s\S]*\.eq\("is_active", false\)/);
  assert.match(loaders, /getKnowledgeForPerson\(\{ personId, includeArchived: true \}\)/);
  assert.match(profile, /deleteId === item\.id/);
  assert.match(profile, /deleteWarning/);
});

test("archive translations are complete in all supported locales", async () => {
  for (const locale of ["uk", "en", "pl", "ru", "de"]) {
    const messages = JSON.parse(await read(`messages/${locale}/person.json`));
    const archive = messages.profileUi.knowledgeArchive;
    for (const key of ["title", "count", "empty", "description", "restore", "delete", "confirmDelete", "deleteWarning", "error"]) {
      assert.ok(archive[key]?.trim(), `${locale}.${key}`);
    }
  }
});

test("correction history is immutable, trigger-authored and owner-readable", async () => {
  const [migration, repository, profile] = await Promise.all([
    read("supabase/migrations/20260810172409_add_memory_knowledge_change_history.sql"),
    read("src/lib/repositories/knowledgeRepository.ts"),
    read("src/components/people/PersonProfileContent.tsx"),
  ]);
  assert.match(migration, /alter table public\.memory_knowledge_changes enable row level security/);
  assert.match(migration, /grant select on table public\.memory_knowledge_changes to authenticated/);
  assert.doesNotMatch(migration, /grant insert[^;]+authenticated/);
  assert.match(migration, /security definer[\s\S]*set search_path = ''/);
  assert.match(migration, /after update of value_text on public\.memories/);
  assert.match(migration, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(repository, /listKnowledgeChangeHistoryForOwnedPerson/);
  assert.match(profile, /KnowledgeChangeHistory/);
});

test("correction history labels exist in all supported locales", async () => {
  for (const locale of ["uk", "en", "pl", "ru", "de"]) {
    const messages = JSON.parse(await read(`messages/${locale}/person.json`));
    for (const key of ["title", "before", "after"]) assert.ok(messages.profileUi.knowledgeHistory[key]?.trim(), `${locale}.${key}`);
  }
});

test("conflict resolution RPC validates the complete owned active set atomically", async () => {
  const [migration, repository, loaders, profile] = await Promise.all([
    read("supabase/migrations/20260810172946_resolve_memory_knowledge_conflicts_atomically.sql"),
    read("src/lib/repositories/knowledgeRepository.ts"),
    read("src/lib/people/people.loaders.ts"),
    read("src/components/people/PersonProfileContent.tsx"),
  ]);
  assert.match(migration, /security invoker/);
  assert.match(migration, /v_owned_active <> v_expected/);
  assert.match(migration, /get diagnostics v_archived = row_count/);
  assert.match(migration, /grant execute[\s\S]*to authenticated/);
  assert.match(repository, /resolveOwnedPersonKnowledgeConflict[\s\S]*resolve_memory_knowledge_conflict/);
  assert.match(loaders, /resolvePersonKnowledgeConflict/);
  assert.match(profile, /KnowledgeConflictSection/);
  assert.match(profile, /allIds\.filter\(\(id\) => id !== winnerId\)/);
});

test("conflict resolution copy exists in every supported locale", async () => {
  for (const locale of ["uk", "en", "pl", "ru", "de"]) {
    const messages = JSON.parse(await read(`messages/${locale}/person.json`));
    const conflict = messages.profileUi.knowledgeConflicts;
    for (const key of ["title", "description", "topic", "positive", "negative", "keepThis", "archiveNote", "error"]) {
      assert.ok(conflict[key]?.trim(), `${locale}.${key}`);
    }
  }
});

test("knowledge review schedule is bounded, owner-scoped and indexed", async () => {
  const [migration, repository, builder, profile] = await Promise.all([
    read("supabase/migrations/20260810173459_add_memory_knowledge_review_schedule.sql"),
    read("src/lib/repositories/knowledgeRepository.ts"),
    read("src/lib/people/buildPeopleViewModels.ts"),
    read("src/components/people/PersonProfileContent.tsx"),
  ]);
  assert.match(migration, /knowledge_reviewed_at timestamptz/);
  assert.match(migration, /knowledge_review_snoozed_until timestamptz/);
  assert.match(migration, /create index memories_due_knowledge_review_idx/);
  assert.match(repository, /reviewOwnedPersonKnowledge[\s\S]*\.eq\("user_id", authenticatedUserId\)[\s\S]*\.eq\("person_id", input\.personId\)[\s\S]*\.eq\("is_active", true\)/);
  assert.match(repository, /30 \* 86_400_000/);
  assert.match(builder, /180 \* 86_400_000/);
  assert.match(builder, /candidates\[0\]/);
  assert.match(profile, /KnowledgeReviewSection/);
});

test("knowledge review copy exists in every supported locale", async () => {
  for (const locale of ["uk", "en", "pl", "ru", "de"]) {
    const messages = JSON.parse(await read(`messages/${locale}/person.json`));
    const review = messages.profileUi.knowledgeReview;
    for (const key of ["title", "question", "lastConfirmed", "explanation", "accurate", "later", "noLongerAccurate", "error"]) {
      assert.ok(review[key]?.trim(), `${locale}.${key}`);
    }
  }
});
