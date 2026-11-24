import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function latestInvokerMigration() {
  const files = (await readdir(new URL("../supabase/migrations/", import.meta.url))).sort();
  let latest = null;
  for (const file of files) {
    const sql = await read(`supabase/migrations/${file}`);
    if (/function\s+private\.invoke_happy_proactive\s*\(/i.test(sql)) latest = { file, sql };
  }
  return latest;
}

test("happy-proactive Edge Function accepts the secret key and the platform JWT check is off", async () => {
  const config = await read("supabase/config.toml");
  const section = config.match(/\[functions\.happy-proactive\][^[]*/)?.[0] ?? "";
  assert.match(section, /verify_jwt\s*=\s*false/);
  assert.match(section, /entrypoint\s*=\s*"\.\/functions\/happy-proactive\/index\.ts"/);
  const edge = await read("supabase/functions/happy-proactive/index.ts");
  assert.match(edge, /withSupabase\(\{ auth: "secret" \}/);
});

test("cron sends the secret on the apikey header, which is the only header secret mode reads", async () => {
  const latest = await latestInvokerMigration();
  assert.ok(latest, "an invoke_happy_proactive migration must exist");
  assert.match(latest.sql, /'apikey',\s*secret_key/);
  assert.doesNotMatch(latest.sql.replace(/--[^\n]*/g, ""), /'Authorization'/);
});

test("cron wrapper still fails loudly and is not callable by API roles", async () => {
  const { sql } = await latestInvokerMigration();
  assert.match(sql, /happy_proactive_cron_configuration_missing/);
  assert.match(sql, /happy_proactive_cron_function_url_invalid/);
  assert.match(sql, /revoke all on function private\.invoke_happy_proactive\(\)\s+from public, anon, authenticated/i);
  assert.match(sql, /security definer\s+set search_path = ''/i);
});

test("the proactive path stays deterministic: no AI, Redis or push provider imports", async () => {
  for (const file of ["index.ts", "proactive-rules.ts", "occasion-rules.ts", "occasion-domain.ts", "proactivity-policy.ts"]) {
    const source = await read(`supabase/functions/happy-proactive/${file}`);
    assert.doesNotMatch(source, /openai|anthropic|upstash|redis|fcm|apns|fetch\(/i, file);
  }
});

test("Vault secret names are the documented pair and no secret value is in source", async () => {
  const { sql } = await latestInvokerMigration();
  assert.match(sql, /'happy_proactive_function_url'/);
  assert.match(sql, /'happy_proactive_cron_authorization'/);
  assert.doesNotMatch(sql, /sb_secret_[A-Za-z0-9_]{8,}/);
});
