import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260810175732_retain_knowledge_review_interactions_for_one_year.sql");

test("review telemetry has an idempotent daily 365-day retention job", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /happydate-prune-knowledge-review-interactions/);
  assert.match(sql, /if not exists[\s\S]*?from cron\.job/i);
  assert.match(sql, /17 3 \* \* \*/);
  assert.match(sql, /delete from public\.knowledge_review_interactions[\s\S]*?interval '365 days'/i);
  assert.doesNotMatch(sql, /create function|security definer/i);
});

test("push export metadata is owner-readable without exposing device tokens", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /grant select \(id, user_id, platform, locale, enabled, last_seen_at, created_at, updated_at\)/i);
  assert.match(sql, /push_devices_select_own_metadata[\s\S]*?auth\.uid\(\)[\s\S]*?user_id/i);
  assert.doesNotMatch(sql, /grant select[^;]*token/i);
});

test("account export is paginated, content-complete and keeps Memory ownership canonical", async () => {
  const repository = await readFile(path.join(root, "src/lib/repositories/accountDataExport.repository.ts"), "utf8");
  const knowledge = await readFile(path.join(root, "src/lib/repositories/knowledgeRepository.ts"), "utf8");
  assert.match(repository, /range\(from, from \+ PAGE_SIZE - 1\)/);
  assert.match(repository, /exportOwnedKnowledgeRows\(user\.id\)/);
  assert.doesNotMatch(repository, /from\("memories"\)/);
  for (const section of ["profiles", "people", "events", "memories", "gifts", "giftLinks", "reminders", "reminderPreferences", "reminderDeliveries", "pushDevices", "knowledgeChanges", "knowledgeReviewInteractions"]) {
    assert.match(repository, new RegExp(`\\b${section}\\b`), section);
  }
  assert.doesNotMatch(repository, /\btoken\b/);
  assert.match(knowledge, /exportOwnedKnowledgeRows[\s\S]*?requireKnowledgeUserId/);
  assert.match(knowledge, /exportOwnedKnowledgeRows[\s\S]*?includeArchived|exportOwnedKnowledgeRows[\s\S]*?from\("memories"\)/);
});

test("export route downloads localized JSON and reports safe errors", async () => {
  const route = await readFile(path.join(root, "src/app/(app)/settings/export/page.tsx"), "utf8");
  assert.match(route, /buildHappyDateAccountExport/);
  assert.match(route, /downloadHappyDateAccountExport/);
  assert.match(route, /role="alert"/);
  for (const locale of ["uk", "en", "pl", "de", "ru"]) {
    const messages = JSON.parse(await readFile(path.join(root, "messages", locale, "profile.json"), "utf8"));
    for (const key of ["title", "description", "includedTitle", "included", "sensitiveNote", "download", "preparing", "done", "error"]) {
      assert.equal(typeof messages.exportSettings[key], "string", `${locale}:${key}`);
      assert.ok(messages.exportSettings[key].trim(), `${locale}:${key}`);
    }
  }
});
