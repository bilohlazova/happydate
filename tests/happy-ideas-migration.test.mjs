import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260927095351_create_happy_ideas.sql",
  import.meta.url,
);

test("happy ideas are read-only to clients and validate privileged cross-owner references", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /create table public\.happy_ideas/i);
  assert.match(sql, /references public\.people\(id\)\s+on delete cascade/i);
  assert.match(sql, /references public\.events\(id\)\s+on delete cascade/i);
  assert.match(sql, /char_length\(btrim\(type\)\) between 1 and 80/i);
  assert.match(sql, /char_length\(btrim\(title\)\) between 1 and 300/i);
  assert.match(sql, /char_length\(btrim\(message\)\) between 1 and 4000/i);
  assert.match(sql, /'new', 'shown', 'accepted', 'dismissed', 'expired'/i);
  assert.match(sql, /reason is null or jsonb_typeof\(reason\) = 'object'/i);
  assert.match(sql, /evidence is null or jsonb_typeof\(evidence\) = 'array'/i);
  assert.match(sql, /create function public\.validate_happy_idea_references\(\)/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = ''/i);
  assert.match(sql, /revoke all on function public\.validate_happy_idea_references\(\)[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /before insert or update of user_id, person_id, event_id/i);
  assert.match(sql, /where p\.id = new\.person_id[\s\S]*p\.user_id = new\.user_id/i);
  assert.match(sql, /where e\.id = new\.event_id[\s\S]*e\.user_id = new\.user_id/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.happy_ideas from public, anon, authenticated/i);
  assert.match(sql, /grant select on table public\.happy_ideas to authenticated/i);
  assert.doesNotMatch(sql, /grant\s+(?:select, )?insert|grant\s+update|grant\s+delete/i);
  assert.match(sql, /happy_ideas_select_own/i);
});
