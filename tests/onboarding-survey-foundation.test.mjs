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

test("survey dates use canonical Events and cannot delete unrelated events", async () => {
  const [sql, page] = await Promise.all([
    readFile(migrationUrl, "utf8"),
    readFile(new URL("../src/app/survey/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(sql, /id = any\(v_existing\.special_date_event_ids\)/);
  assert.match(sql, /insert into public\.events/);
  assert.match(sql, /'yearly'/);
  assert.match(page, /\.from\("events"\)/);
  assert.match(page, /\.rpc\("save_my_onboarding_survey"/);
  assert.doesNotMatch(page, /user_special_dates/);
});

test("account export includes the private onboarding answers", async () => {
  const source = await readFile(
    new URL("../src/lib/repositories/accountDataExport.repository.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /exportOwnedRows\("user_survey"/);
  assert.match(source, /data: \{ profiles, survey, people, events/);
});
