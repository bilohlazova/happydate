import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260816113917_harden_authenticated_reminder_rpcs.sql",
);

test("authenticated reminder RPCs reject nulls and keep a narrow privilege boundary", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /if p_limit is null or p_limit < 1 or p_limit > 50 then/i);
  assert.match(sql, /if p_platform is null or p_platform not in \('ios', 'android'\) then/i);
  assert.match(sql, /if normalized_token is null[\s\S]*?raise exception 'Invalid push token'/i);
  assert.match(sql, /if normalized_locale is null[\s\S]*?raise exception 'Invalid locale'/i);

  for (const functionName of [
    "consume_my_in_app_deliveries",
    "register_my_push_device",
    "disable_my_push_devices",
  ]) {
    assert.match(sql, new RegExp(`create or replace function public\\.${functionName}[\\s\\S]*?security definer[\\s\\S]*?set search_path = ''`, "i"));
    assert.match(sql, new RegExp(`revoke all on function public\\.${functionName}[\\s\\S]*?from public, anon, authenticated`, "i"));
    assert.match(sql, new RegExp(`grant execute on function public\\.${functionName}[\\s\\S]*?to authenticated`, "i"));
  }
});

test("every privileged reminder RPC derives its scope from the authenticated user", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const authChecks = sql.match(/current_user_id uuid := \(select auth\.uid\(\)\)/gi) ?? [];
  const rejectionChecks = sql.match(/if current_user_id is null then/gi) ?? [];

  assert.equal(authChecks.length, 3);
  assert.equal(rejectionChecks.length, 3);
  assert.match(sql, /delivery\.user_id = current_user_id/i);
  assert.match(sql, /where user_id = current_user_id/i);
});
