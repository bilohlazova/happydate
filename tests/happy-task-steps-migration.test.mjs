import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260927094751_create_happy_task_steps.sql",
  import.meta.url,
);

test("happy task steps inherit task ownership and preserve ordered step integrity", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /create table public\.happy_task_steps/i);
  assert.doesNotMatch(sql, /^\s*user_id\b/im);
  assert.match(sql, /references public\.happy_tasks\(id\)\s+on delete cascade/i);
  assert.match(sql, /check \(position >= 1\)/i);
  assert.match(sql, /unique \(task_id, position\)/i);
  assert.match(sql, /char_length\(btrim\(type\)\) between 1 and 80/i);
  assert.match(sql, /char_length\(btrim\(title\)\) between 1 and 300/i);
  assert.match(sql, /'pending', 'active', 'waiting_user', 'completed', 'skipped', 'failed', 'cancelled'/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.happy_task_steps from public, anon, authenticated/i);
  assert.match(sql, /grant select, insert, update on table public\.happy_task_steps to authenticated/i);
  assert.match(sql, /happy_task_steps_select_own/i);
  assert.match(sql, /happy_task_steps_insert_own/i);
  assert.match(sql, /happy_task_steps_update_own/i);
  assert.match(sql, /t\.id = task_id[\s\S]*t\.user_id = \(select auth\.uid\(\)\)/i);
});
