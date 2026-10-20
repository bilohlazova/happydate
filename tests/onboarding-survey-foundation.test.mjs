import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260816115946_restore_secure_onboarding_survey.sql",
  import.meta.url,
);

test("onboarding survey is private and owner-readable", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /create table if not exists public\.user_survey/);
  assert.match(sql, /references auth\.users\(id\) on delete cascade/);
  assert.match(sql, /alter table public\.user_survey enable row level security/);
  assert.match(sql, /revoke all on table public\.user_survey from public, anon, authenticated/);
  assert.match(sql, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete).*user_survey to authenticated/i);
});

test("survey completion and reward are atomic and idempotent", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /function public\.save_my_onboarding_survey/);
  assert.match(sql, /security definer\s+set search_path = ''/);
  assert.match(sql, /v_existing\.reward_granted_at is null/);
  assert.match(sql, /pg_catalog\.pg_advisory_xact_lock/);
  assert.match(sql, /set points = coalesce\(public\.profiles\.points, 0\) \+ 100/);
  assert.match(sql, /coalesce\(public\.user_survey\.reward_granted_at, excluded\.reward_granted_at\)/);
  assert.match(sql, /grant execute on function public\.save_my_onboarding_survey/);
});

test("Block D preserves legacy event answers when the new onboarding UI omits dates", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20261020153546_preserve_legacy_survey_events.sql", import.meta.url), "utf8");
  assert.match(sql, /p_special_dates is null/);
  assert.match(sql, /preserve legacy survey events/);
  assert.match(sql, /coalesce\(v_existing\.special_date_event_ids, '\{\}'\)/);
  assert.match(sql, /v_existing\.reward_granted_at is null/);
});

test("survey dates use canonical Events without deleting legacy or unrelated events", async () => {
  const [sql, page] = await Promise.all([
    readFile(migrationUrl, "utf8"),
    readFile(new URL("../src/app/survey/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(sql, /insert into public\.events/);
  assert.match(sql, /'yearly'/);
  assert.match(page, /\.from\("events"\)/);
  assert.match(page, /\.rpc\("save_my_onboarding_survey"/);
  assert.doesNotMatch(page, /user_special_dates/);
});

test("latest onboarding RPC preserves event rows and records provenance for new rows", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20261020153546_preserve_legacy_survey_events.sql", import.meta.url), "utf8");
  assert.match(sql, /add column if not exists survey_origin/);
  assert.match(sql, /survey_origin[\s\S]*onboarding survey/i);
  assert.match(sql, /survey_origin\)\s*values[\s\S]*'onboarding_survey'/i);
  assert.match(sql, /update public\.events[\s\S]*survey_origin = 'onboarding_survey'/i);
  assert.match(sql, /event\.user_id = v_user_id/);
  assert.match(sql, /for update/);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.events/i);
  assert.match(sql, /where user_id = v_user_id/);
  assert.match(sql, /pg_catalog\.pg_advisory_xact_lock/);
  assert.match(sql, /v_existing\.reward_granted_at is null/);
});

test("account export includes the private onboarding answers", async () => {
  const source = await readFile(
    new URL("../src/lib/repositories/accountDataExport.repository.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /exportOwnedRows\("user_survey"/);
  assert.match(source, /data: \{ profiles, survey, people, events/);
});
