import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = new URL("../supabase/migrations/20260927100223_create_happy_actions.sql", import.meta.url);

test("happy actions are client read-only and validate privileged task-step ownership", async () => {
  const sql = await readFile(migration, "utf8");
  assert.match(sql, /create table public\.happy_actions/i);
  assert.match(sql, /step_id is null or task_id is not null/i);
  assert.match(sql, /jsonb_typeof\(payload\) = 'object'/i);
  assert.match(sql, /unique \(user_id, idempotency_key\)/i);
  assert.match(sql, /security definer[\s\S]*set search_path = ''/i);
  assert.match(sql, /s\.id = new\.step_id and s\.task_id = new\.task_id and t\.user_id = new\.user_id/i);
  assert.match(sql, /revoke all on table public\.happy_actions from public, anon, authenticated/i);
  assert.match(sql, /grant select on table public\.happy_actions to authenticated/i);
  assert.match(sql, /happy_actions_select_own/i);
});
