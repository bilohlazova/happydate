import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("planner preferences are private, bounded and explicitly exposed only to authenticated owners", async () => {
  const [migration, grants] = await Promise.all([
    read("supabase/migrations/20260816145828_create_planner_preferences.sql"),
    read("supabase/migrations/20260816145907_restrict_planner_preferences_grants.sql"),
  ]);
  assert.match(migration, /create table if not exists public\.planner_preferences/);
  assert.match(migration, /primary key references auth\.users\(id\) on delete cascade/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(migration, /for insert\s+to authenticated\s+with check \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(migration, /for update\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)\s+with check/);
  assert.match(migration, /revoke all on table public\.planner_preferences from anon/);
  assert.match(migration, /grant select, insert, update on table public\.planner_preferences to authenticated/);
  assert.match(migration, /day_start < day_end/);
  assert.match(grants, /revoke all on table public\.planner_preferences from authenticated/);
  assert.match(grants, /grant select, insert, update on table public\.planner_preferences to authenticated/);
});

test("Calendar loads defaults and saves them only through a separate explicit action", async () => {
  const [repository, page] = await Promise.all([
    read("src/lib/repositories/plannerPreferences.repository.ts"),
    read("src/app/(app)/dashboard/page.tsx"),
  ]);
  assert.match(repository, /\.eq\("user_id", userId\)/);
  assert.match(repository, /\.upsert\(\{/);
  assert.match(repository, /onConflict: "user_id"/);
  assert.match(page, /loadPlannerPreferences\(user\.id\)/);
  assert.match(page, /onClick=\{saveDefaults\}/);
  assert.match(page, /onSavePreferences=\{persistPlannerPreferences\}/);
  assert.doesNotMatch(page, /await onSavePreferences[\s\S]{0,120}await onSave\(/);
});
