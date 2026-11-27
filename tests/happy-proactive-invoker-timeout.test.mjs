import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// HD-PR-009: the invoker's only change against the hardened version is the
// pg_net response timeout, which must outlast the Edge platform's 150 s limit.
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const body = (sql) => sql.split(/\n/).filter((line) => !/^\s*--/.test(line)).join("\n");
const fn = (sql) => body(sql).slice(body(sql).search(/create or replace function private\.invoke_happy_proactive/i));

test("the timeout migration differs from the hardened invoker only by the timeout value", async () => {
  const before = fn(await read("supabase/migrations/20261125180000_harden_happy_proactive_cron_authorization.sql"));
  const after = fn(await read("supabase/migrations/20261127120000_hd_pr_009_happy_proactive_invoker_timeout.sql"));
  assert.equal(after, before.replace("timeout_milliseconds := 30000", "timeout_milliseconds := 160000"));
  assert.notEqual(after, before);
});

test("the invoker waits longer than the 150 s Edge request idle timeout", async () => {
  const sql = fn(await read("supabase/migrations/20261127120000_hd_pr_009_happy_proactive_invoker_timeout.sql"));
  const timeout = Number(/timeout_milliseconds\s*:=\s*(\d+)/.exec(sql)?.[1]);
  assert.ok(timeout > 150_000 && timeout <= 180_000, `timeout ${timeout} must be in (150000, 180000]`);
});

test("privileges, security definer and search_path are unchanged", async () => {
  const sql = body(await read("supabase/migrations/20261127120000_hd_pr_009_happy_proactive_invoker_timeout.sql"));
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = ''/i);
  assert.match(sql, /revoke all on function private\.invoke_happy_proactive\(\)\s+from public, anon, authenticated;/i);
  assert.doesNotMatch(sql, /\bgrant\b/i);
  assert.doesNotMatch(sql, /cron\.(schedule|alter_job|unschedule)/i);
});

test("the Edge time budget stays below the invoker timeout", async () => {
  const batching = await read("supabase/functions/happy-proactive/batching.ts");
  const budget = Number(/PROACTIVE_RUN_TIME_BUDGET_MS\s*=\s*([\d_]+)/.exec(batching)?.[1].replaceAll("_", ""));
  assert.ok(budget > 0 && budget + 20_000 < 150_000, "run budget plus one page and the Occasion pass must fit in 150 s");
});
