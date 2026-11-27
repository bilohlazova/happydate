import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// HD-PR-010: the run log, collector, alerts and retention are SQL. These tests pin the
// properties that must never regress: no personal data, no access for API roles, no
// scheduler side effects, bounded growth and an unchanged invoker apart from the log insert.

const migrationsDir = join(process.cwd(), "supabase/migrations");
const byName = (suffix) => {
  const file = readdirSync(migrationsDir).find((name) => name.endsWith(suffix));
  assert.ok(file, `migration ending in ${suffix} exists`);
  return readFileSync(join(migrationsDir, file), "utf8");
};
const sql = byName("_hd_pr_010_happy_proactive_run_log.sql");
const previousInvoker = byName("_hd_pr_009_happy_proactive_invoker_timeout.sql");
const rollback = readFileSync(
  join(process.cwd(), "supabase/rollbacks/20261127130000_hd_pr_010_happy_proactive_run_log.rollback.sql"),
  "utf8",
);
const stripComments = (text) => text.split("\n").filter((line) => !line.trim().startsWith("--")).join("\n");
const code = stripComments(sql);
const index = readFileSync(join(process.cwd(), "supabase/functions/happy-proactive/index.ts"), "utf8");

const tableBlock = (name) => {
  const match = code.match(new RegExp(`create table if not exists private\\.${name} \\(([\\s\\S]*?)\\n\\);`));
  assert.ok(match, `${name} table is defined`);
  return match[1];
};

test("run_log columns hold numbers, timestamps and whitelisted codes only", () => {
  const columns = [...tableBlock("happy_proactive_run_log").matchAll(/^\s{2}([a-z_]+) (bigint|integer|boolean|timestamptz|text)/gm)].map((m) => [m[1], m[2]]);
  const text = columns.filter(([, type]) => type === "text").map(([name]) => name);
  assert.deepEqual(text.sort(), ["error_code", "outcome"]);
  for (const [name] of columns) {
    assert.doesNotMatch(name, /content|header|body|message|email|token|secret|url|name|user|person|text|note/, name);
  }
  assert.match(tableBlock("happy_proactive_run_log"), /error_code text\s+check \(error_code in \(/);
  assert.match(tableBlock("happy_proactive_run_log"), /outcome text not null\s+check \(outcome in \(/);
});

test("the collector never copies response bodies, headers, messages or error text into the log", () => {
  const collector = code.match(/function private\.collect_happy_proactive_run_log\(\)[\s\S]*?\$function\$;/)[0];
  assert.doesNotMatch(collector, /error_msg/);
  assert.doesNotMatch(collector, /\bcontent\b\s*,|resp\.content\s*(?!\))/);
  assert.match(collector, /private\.happy_proactive_error_code\(r\.j ->> 'error'\)/);
  assert.match(collector, /private\.happy_proactive_cron_error_code\(d\.return_message\)/);
  assert.doesNotMatch(collector, /headers/);
  // return_message is only ever read through the code mapper
  assert.equal((code.match(/return_message/g) ?? []).length, (code.match(/cron_error_code\(d\.return_message\)/g) ?? []).length);
});

test("a response without durationMs leaves duration_ms NULL (least() would turn NULL into the cap)", () => {
  const collector = code.match(/function private\.collect_happy_proactive_run_log\(\)[\s\S]*?\$function\$;/)[0];
  assert.match(collector, /duration_ms = case when r\.status_code = 200\s+and private\.happy_proactive_int\(r\.j, array\['durationMs'\]\) is not null then/);
});

test("all three tables use RLS and are closed to every API role", () => {
  for (const table of ["happy_proactive_run_log", "happy_proactive_alerts", "happy_proactive_monitor_state"]) {
    assert.match(code, new RegExp(`alter table private\\.${table} enable row level security;`));
    assert.match(code, new RegExp(`revoke all on table private\\.${table} from public, anon, authenticated, service_role;`));
  }
  assert.doesNotMatch(code, /\bgrant\b/i);
  assert.doesNotMatch(code, /create policy/i);
});

test("every function is security definer with an empty search_path and is revoked from API roles", () => {
  const functions = [...code.matchAll(/create or replace function (private\.[a-z_]+)\(([^)]*)\)/g)];
  assert.ok(functions.length >= 12, "all functions are covered");
  for (const [, name] of functions) {
    const body = code.slice(code.indexOf(`create or replace function ${name}(`)).split(/\$function\$;/)[0];
    assert.match(body, /security definer/, name);
    assert.match(body, /set search_path = ''/, name);
    assert.match(code, new RegExp(`revoke all on function ${name.replace(".", "\\.")}\\([^)]*\\)\\s+from public, anon, authenticated, service_role;`), name);
  }
  assert.match(code, /revoke all on private\.happy_proactive_run_health from public, anon, authenticated, service_role;/);
});

test("the monitor job is created inactive and the happy-proactive job is never touched", () => {
  assert.match(code, /perform cron\.schedule\('happydate-happy-proactive-monitor', '\*\/5 \* \* \* \*'/);
  assert.match(code, /perform cron\.alter_job\([\s\S]*?'happydate-happy-proactive-monitor'\),\s*active := false\)/);
  assert.equal((code.match(/cron\.schedule\(/g) ?? []).length, 1);
  assert.equal((code.match(/cron\.alter_job\(/g) ?? []).length, 1);
  assert.doesNotMatch(code, /happydate-happy-proactive-every-two-hours/);
  assert.doesNotMatch(code, /cron\.unschedule/);
  assert.doesNotMatch(code, /update cron\.job|delete from cron\./i);
});

test("the invoker differs from the HD-PR-009 invoker only by the guarded run-log insert", () => {
  const take = (text) => text.match(/create or replace function private\.invoke_happy_proactive\(\)[\s\S]*?\$function\$;/)[0];
  const norm = (text) =>
    stripComments(text)
      .replace(/\bsent_request_id\b/g, "request_id")
      .replace(/\s+/g, " ");
  const before = norm(take(previousInvoker));
  const after = norm(take(sql));
  const logBlock = after.match(/ begin if \(select count\(\*\) from \(select 1 from private\.happy_proactive_run_log limit 20000\) capped\) < 20000 then .*? end; return request_id;/);
  assert.ok(logBlock, "run-log block exists");
  assert.equal(after.replace(logBlock[0], " return request_id;"), before);
  assert.match(logBlock[0], /exception when others then raise warning 'happy_proactive_run_log_insert_failed %', sqlstate;/);
  assert.match(after, /timeout_milliseconds := 160000/);
  assert.match(after, /'\^https:\/\/\[a-z\]\{20\}\\\.supabase\\\.co\/functions\/v1\/happy-proactive\$'/);
});

test("growth is bounded: 30 days, newest 5,000 rows, hard ceiling 20,000, daily pruning", () => {
  assert.match(code, /where started_at < now\(\) - interval '30 days'/);
  assert.match(code, /order by id desc offset 5000 limit 1/);
  assert.match(code, /limit 20000\) capped\) < 20000/);
  assert.match(code, /retention_at < now\(\) - interval '23 hours'/);
  assert.match(code, /limit 200\s+on conflict \(cron_run_id\) do nothing/);
  assert.match(code, /cron_last_runid/);
});

test("alert rules: 3 h 30 min without success, failures, repeats, truncation and slowness", () => {
  assert.match(code, /'no_success_3h30', 'critical',\s+job_active and now\(\) - base > interval '3 hours 30 minutes'/);
  assert.match(code, /'run_failed', 'critical', consecutive >= 1/);
  assert.match(code, /'repeated_failures', 'critical', consecutive >= 2/);
  assert.match(code, /'scan_truncated', 'warning'[\s\S]*?lr_pages, 0\) >= 80/);
  assert.match(code, /'slow_run_warning', 'warning', coalesce\(lr_duration > 100000, false\)/);
  assert.match(code, /'slow_run_critical', 'critical', coalesce\(lr_duration >= 130000, false\)/);
  assert.match(code, /notify_count < 8 and now\(\) - cur\.last_notified_at >= interval '6 hours'/);
  assert.match(code, /job_last_inactive_at/);
});

test("alert delivery uses only a Vault HTTPS webhook and a message of numbers and codes", () => {
  assert.match(code, /name = 'happy_proactive_alert_webhook_url'/);
  assert.match(code, /hook !~ '\^https:\/\/\[A-Za-z0-9\.-\]\+/);
  assert.doesNotMatch(code, /https:\/\/hooks\.|discord\.com|slack\.com|ntfy\.sh|api\.telegram/);
  assert.match(code, /'text', msg, 'content', msg/);
  assert.match(code, /exception when others then\s+raise warning 'happy_proactive_alert_send_failed %', sqlstate;/);
  assert.doesNotMatch(code, /sb_secret|sb_publishable|eyJ[A-Za-z0-9_-]{10,}|bearer [a-z]/i);
});

test("the monitor never raises: an exception would roll back the alert state and queued webhook messages", () => {
  const monitor = code.match(/function private\.run_happy_proactive_monitor\(\)[\s\S]*?\$function\$;/)[0];
  assert.doesNotMatch(monitor, /raise exception/);
  // every step is isolated, so one failing step cannot hide the others
  assert.equal((monitor.match(/exception when others then/g) ?? []).length, 5);
  assert.match(monitor, /'monitor_failed', 'critical', problems <> ''/);
  assert.match(monitor, /if problems = '' then\s+insert into private\.happy_proactive_monitor_state \(key, value\)\s+values \('last_monitor_ok_at'/);
  // evaluation does not depend on the collector succeeding
  assert.ok(monitor.indexOf("collect_happy_proactive_run_log") < monitor.indexOf("evaluate_happy_proactive_alerts"));
});

test("a failed webhook delivery is detected and retried without using up the reminder budget", () => {
  assert.match(code, /last_request_id bigint,\s+delivery_failed boolean not null default false/);
  assert.match(code, /set delivery_failed = \(coalesce\(r\.timed_out, false\) or r\.status_code is null\s+or r\.status_code not between 200 and 299\)/);
  assert.match(code, /cur\.delivery_failed and now\(\) - cur\.last_notified_at >= interval '10 minutes'/);
  assert.match(code, /'FIRING \(retry\)'/);
  assert.match(code, /returns bigint[\s\S]*?function\$;/);
  // only the HTTP status is looked at, never the webhook response body
  const collector = code.match(/function private\.collect_happy_proactive_run_log\(\)[\s\S]*?\$function\$;/)[0];
  assert.doesNotMatch(collector.slice(collector.indexOf("delivery_failed")), /\.content/);
});

test("poisoned or out-of-range responses cannot abort the collector batch", () => {
  assert.match(code, /set http_status = case when r\.status_code between 100 and 599 then r\.status_code end/);
  assert.match(code, /least\(coalesce\(sum\(value::bigint\), 0\), 2147483647\)::integer/);
  assert.match(code, /value ~ '\^\[0-9\]\{1,9\}\$'/);
});

test("retention never prunes the newest successful run", () => {
  const prune = code.match(/function private\.prune_happy_proactive_run_log\(\)[\s\S]*?\$function\$;/)[0];
  assert.match(prune, /select max\(id\) into keep_id[\s\S]*?outcome in \('ok', 'truncated'\)/);
  assert.equal((prune.match(/id is distinct from keep_id/g) ?? []).length, 2);
});

test("the health view exposes delivery and webhook state without secret values", () => {
  const view = code.match(/create or replace view private\.happy_proactive_run_health[\s\S]*?;\n/)[0];
  assert.match(view, /as alerts_delivery_failed/);
  assert.match(view, /exists \(select 1 from vault\.decrypted_secrets[\s\S]*?\) as webhook_configured/);
  assert.doesNotMatch(view, /decrypted_secret\s*[,)]|select decrypted_secret/);
});

test("the rollback restores the HD-PR-009 invoker, removes the job and drops every object", () => {
  assert.match(rollback, /cron\.unschedule\('happydate-happy-proactive-monitor'\)/);
  assert.match(rollback, /timeout_milliseconds := 160000/);
  assert.doesNotMatch(rollback.replace(/--.*$/gm, ""), /happy_proactive_run_log \(/);
  for (const name of ["run_health", "run_happy_proactive_monitor", "prune_happy_proactive_run_log", "evaluate_happy_proactive_alerts", "happy_proactive_set_alert", "send_happy_proactive_alert", "collect_happy_proactive_run_log", "happy_proactive_sum_object", "happy_proactive_int", "happy_proactive_cron_error_code", "happy_proactive_error_code", "happy_proactive_try_jsonb"]) {
    assert.match(rollback, new RegExp(name), name);
  }
  for (const table of ["happy_proactive_monitor_state", "happy_proactive_alerts", "happy_proactive_run_log"]) {
    assert.match(rollback, new RegExp(`drop table if exists private\\.${table};`));
  }
  assert.doesNotMatch(rollback.replace(/--.*$/gm, ""), /cron\.alter_job|update cron\.job|jobid = 3/);
  const restored = rollback.match(/create or replace function private\.invoke_happy_proactive\(\)[\s\S]*?\$function\$;/)[0];
  const original = previousInvoker.match(/create or replace function private\.invoke_happy_proactive\(\)[\s\S]*?\$function\$;/)[0];
  assert.equal(stripComments(restored).replace(/\s+/g, " "), stripComments(original).replace(/\s+/g, " "));
});

test("the Edge Function reports its duration and no personal data", () => {
  assert.match(index, /const startedAtMs = Date\.now\(\);/);
  assert.match(index, /const durationMs = Date\.now\(\) - startedAtMs;/);
  assert.match(index, /scan: \{ pages: scan\.pages, truncated: scan\.truncated \}, durationMs \}\)/);
  assert.match(index, /truncated: scan\.truncated, durationMs \}\)\);/);
  // the authorization order is unchanged: secret first, then method, then body
  assert.ok(index.indexOf("verifyCronAuthorization") < index.indexOf("method_not_allowed"));
  assert.ok(index.indexOf("method_not_allowed") < index.indexOf("unexpected_request_payload"));
});
