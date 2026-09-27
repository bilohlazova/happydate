import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const migration = new URL("../supabase/migrations/20260927101511_create_happy_notifications.sql", import.meta.url);
test("happy notifications are client read-only with durable dedupe and owner validation", async () => {
  const sql = await readFile(migration, "utf8");
  assert.match(sql, /create table public\.happy_notifications/i);
  assert.match(sql, /priority in \('silent','normal','important'\)/i);
  assert.match(sql, /unique\(user_id,dedupe_key\)/i);
  assert.match(sql, /security definer set search_path=''/i);
  assert.match(sql, /happy_notifications_user_active_created_at_idx/i);
  assert.match(sql, /happy_notifications_user_unread_created_at_idx/i);
  assert.match(sql, /happy_notifications_user_task_created_at_idx/i);
  assert.match(sql, /grant select on table public\.happy_notifications to authenticated/i);
  assert.match(sql, /happy_notifications_select_own/i);
});
