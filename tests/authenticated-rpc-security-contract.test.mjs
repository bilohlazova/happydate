import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const reminderMigration = await readFile(
  "supabase/migrations/20260816113917_harden_authenticated_reminder_rpcs.sql",
  "utf8",
);
const surveyMigration = await readFile(
  "supabase/migrations/20260823125108_bound_privileged_rpc_payloads.sql",
  "utf8",
);

test("all authenticated SECURITY DEFINER RPCs keep explicit identity and grants", () => {
  for (const [sql, functionName] of [
    [reminderMigration, "consume_my_in_app_deliveries"],
    [reminderMigration, "register_my_push_device"],
    [reminderMigration, "disable_my_push_devices"],
    [surveyMigration, "save_my_onboarding_survey"],
  ]) {
    assert.match(sql, new RegExp(`function public\\.${functionName}[\\s\\S]*?security definer[\\s\\S]*?set search_path = ''`, "i"));
    assert.match(sql, new RegExp(`revoke all on function public\\.${functionName}[\\s\\S]*?from public, anon, authenticated`, "i"));
    assert.match(sql, new RegExp(`grant execute on function public\\.${functionName}[\\s\\S]*?to authenticated`, "i"));
  }
  assert.match(surveyMigration, /v_user_id uuid := auth\.uid\(\)/i);
  assert.match(surveyMigration, /if v_user_id is null then/i);
});

test("onboarding RPC bounds individual and aggregate user-controlled collections", () => {
  assert.match(surveyMigration, /cardinality\(p_likes\).*?> 50/i);
  assert.match(surveyMigration, /char_length\(value\) > 280/i);
  assert.match(surveyMigration, /octet_length\(pg_catalog\.array_to_string\(coalesce\(p_likes/i);
  assert.match(surveyMigration, /octet_length\(coalesce\(p_special_dates.*?> 50000/i);
  assert.match(surveyMigration, /jsonb_array_length\(coalesce\(p_special_dates.*?> 50/i);
});
