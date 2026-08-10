import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260810175228_add_private_knowledge_review_interactions.sql");

test("knowledge review measurement is content-free, bounded daily and owner-scoped", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /create table public\.knowledge_review_interactions/i);
  assert.match(sql, /channel in \('home', 'voice', 'profile'\)/i);
  assert.match(sql, /action in \('shown', 'confirmed', 'snoozed', 'archived'\)/i);
  assert.match(sql, /unique \(user_id, occurred_on, channel, action\)/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /select_own[\s\S]*?auth\.uid\(\)[\s\S]*?user_id/i);
  assert.match(sql, /insert_own_today[\s\S]*?auth\.uid\(\)[\s\S]*?occurred_on/i);
  assert.doesNotMatch(sql, /person_id|knowledge_id|memory_id|content_text|value_text|source_excerpt/i);
  assert.doesNotMatch(sql, /grant (?:update|delete)/i);
});

test("interaction recording is best-effort and sends no user content", async () => {
  const repository = await readFile(path.join(root, "src/lib/repositories/knowledgeReviewInteractions.repository.ts"), "utf8");
  assert.match(repository, /ignoreDuplicates: true/);
  assert.match(repository, /user_id: data\.user\.id, channel, action/);
  assert.match(repository, /catch \{/);
  assert.doesNotMatch(repository, /personId|knowledgeId|memoryId|valueText|contentText|excerpt/);
});

test("Home, detailed voice and successful Profile actions record their own channel", async () => {
  const home = await readFile(path.join(root, "src/components/HomePageClient.tsx"), "utf8");
  const voice = await readFile(path.join(root, "src/components/home-dashboard/HomeAssistantActions.tsx"), "utf8");
  const profile = await readFile(path.join(root, "src/components/people/PersonProfileContent.tsx"), "utf8");
  assert.match(home, /recordKnowledgeReviewInteraction\("home", "shown"\)/);
  assert.match(voice, /mode === "detailed"[\s\S]*?knowledge-review-question[\s\S]*?recordKnowledgeReviewInteraction\("voice", "shown"\)/);
  assert.match(profile, /recordKnowledgeReviewInteraction\("profile", "shown"\)/);
  assert.match(profile, /"confirmed"[\s\S]*?"snoozed"[\s\S]*?"archived"/);
});
