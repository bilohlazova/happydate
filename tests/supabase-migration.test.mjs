import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260803181635_harden_core_rls_storage_and_realtime.sql",
  import.meta.url,
);

test("core hardening migration protects client-owned and privileged surfaces", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /revoke all on function public\.rls_auto_enable\(\) from public, anon, authenticated/);
  assert.match(sql, /grant select on table public\.subscriptions to authenticated/);
  assert.doesNotMatch(sql, /grant [^;]*(?:insert|update)[^;]*public\.subscriptions/i);
  assert.match(sql, /grant update \(full_name, phone, preferences, avatar_url, preferred_locale\)/);
  assert.match(sql, /create policy "events_insert_own"/);
  assert.match(sql, /create policy "memories_insert_own"/);
  assert.match(sql, /create policy "avatars_insert_own"/);
  assert.match(sql, /create policy "memory_images_delete_own"/);
  assert.match(sql, /create policy "memory_audio_delete_own"/);
  assert.match(sql, /alter publication supabase_realtime add table public\.events/);
});

test("core hardening migration contains no destructive data or history operation", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.doesNotMatch(sql, /\b(?:truncate|delete\s+from|drop\s+table|drop\s+column)\b/i);
  assert.doesNotMatch(sql, /supabase_migrations\.schema_migrations/i);
  assert.doesNotMatch(sql, /migration\s+repair/i);
});
