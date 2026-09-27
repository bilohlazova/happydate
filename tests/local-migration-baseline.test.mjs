import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const baselineUrl = new URL("../supabase/migrations/20260401000000_create_core_schema_baseline.sql", import.meta.url);

test("local migration history has a non-destructive core baseline before ALTER migrations", async () => {
  const sql = await readFile(baselineUrl, "utf8");
  for (const table of ["profiles", "people", "events", "memories", "subscriptions"]) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\b`, "i"));
  }
  assert.doesNotMatch(sql, /drop\s+(table|schema)|truncate|delete\s+from/i);
});

test("core baseline captures the historical columns that later migrations assume", async () => {
  const sql = await readFile(baselineUrl, "utf8");

  assert.match(sql, /preferences\s+text\b/i);
  assert.match(sql, /ai_summary\s+text\b/i);
  assert.match(sql, /ai_emotional_score\s+numeric\b/i);
  assert.match(sql, /plan\s+text\s+not null\s+default\s+'care_monthly'/i);
  assert.match(sql, /trial_end\s+timestamptz/i);
  assert.match(sql, /current_period_end\s+timestamptz/i);
  assert.match(sql, /constraint\s+unique_user_subscription\s+unique\s*\(user_id\)/i);
  assert.match(sql, /references\s+public\.profiles\s*\(id\)\s+on delete cascade/i);

  const profilesBlock = sql.match(/create table public\.profiles\s*\(([\s\S]*?)\);/i)?.[1] ?? "";
  const subscriptionsBlock = sql.match(/create table public\.subscriptions\s*\(([\s\S]*?)\);/i)?.[1] ?? "";
  assert.doesNotMatch(profilesBlock, /updated_at/i);
  assert.doesNotMatch(subscriptionsBlock, /updated_at/i);
});
