import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = new URL(
  "../supabase/migrations/20260803184825_create_reminder_lifecycle.sql",
  import.meta.url,
);

test("reminder persistence is occurrence-scoped and separates completion from delivery", async () => {
  const sql = await readFile(migration, "utf8");
  assert.match(sql, /unique \(user_id, event_id, occurrence_date, action_kind\)/i);
  assert.match(sql, /state in \('pending', 'snoozed', 'completed', 'cancelled'\)/i);
  assert.match(sql, /next_remind_at timestamptz/i);
  assert.match(sql, /completed_at timestamptz/i);
  assert.doesNotMatch(sql, /push_token|notification_delivery/i);
});

test("reminder RLS and grants enforce owner and same-owner event access", async () => {
  const sql = await readFile(migration, "utf8");
  assert.match(sql, /alter table public\.reminders enable row level security/i);
  assert.match(sql, /revoke all on table public\.reminders from public, anon, authenticated/i);
  assert.match(sql, /on public\.reminders for select to authenticated[\s\S]*?\(select auth\.uid\(\)\) = user_id/i);
  assert.match(sql, /on public\.reminders for insert to authenticated[\s\S]*?event\.user_id = \(select auth\.uid\(\)\)/i);
  assert.match(sql, /on public\.reminders for update to authenticated[\s\S]*?with check/i);
  assert.doesNotMatch(sql, /grant delete/i);
});

test("reminder due-work and foreign-key access paths are indexed", async () => {
  const sql = await readFile(migration, "utf8");
  assert.match(sql, /create index reminders_event_id_idx on public\.reminders \(event_id\)/i);
  assert.match(sql, /create index reminders_user_active_due_idx[\s\S]*?\(user_id, next_remind_at\)[\s\S]*?where state in \('pending', 'snoozed'\)/i);
});
