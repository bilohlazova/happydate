import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { projectRefFromSupabaseUrl, verifyCronAuthorization } from "../supabase/functions/happy-proactive/cron-auth.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const stripComments = (sql) => sql.replace(/--[^\n]*/g, "");

async function latestInvokerMigration() {
  const files = (await readdir(new URL("../supabase/migrations/", import.meta.url))).sort();
  let latest = null;
  for (const file of files) {
    const sql = await read(`supabase/migrations/${file}`);
    if (/function\s+private\.invoke_happy_proactive\s*\(/i.test(sql)) latest = { file, sql };
  }
  return latest;
}

const REF = "abcdefghijklmnopqrst";
const OTHER_REF = "tsrqponmlkjihgfedcba";
const TOKEN = "Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MGFiY2RlZmdoaWo";
const SECRET = `${REF}.${TOKEN}`;

test("cron secret check: only the exact bearer secret passes", async () => {
  assert.equal(await verifyCronAuthorization(`Bearer ${SECRET}`, SECRET, REF), "ok");
  assert.equal(await verifyCronAuthorization(`Bearer ${SECRET}x`, SECRET, REF), "unauthorized");
  assert.equal(await verifyCronAuthorization(`Bearer ${SECRET.slice(0, -1)}`, SECRET, REF), "unauthorized");
  assert.equal(await verifyCronAuthorization(SECRET, SECRET, REF), "unauthorized");
  assert.equal(await verifyCronAuthorization(`bearer ${SECRET}`, SECRET, REF), "unauthorized");
  assert.equal(await verifyCronAuthorization(`Bearer  ${SECRET}`, SECRET, REF), "unauthorized");
  assert.equal(await verifyCronAuthorization("Bearer ", SECRET, REF), "unauthorized");
  assert.equal(await verifyCronAuthorization("", SECRET, REF), "unauthorized");
  assert.equal(await verifyCronAuthorization(null, SECRET, REF), "unauthorized");
});

test("cron secret check fails closed when the secret is missing, weak or built for another environment", async () => {
  assert.equal(await verifyCronAuthorization(`Bearer ${SECRET}`, undefined, REF), "misconfigured");
  assert.equal(await verifyCronAuthorization(`Bearer ${SECRET}`, "", REF), "misconfigured");
  assert.equal(await verifyCronAuthorization("Bearer short", "short", REF), "misconfigured");
  assert.equal(await verifyCronAuthorization(`Bearer ${TOKEN}`, TOKEN, REF), "misconfigured");
  assert.equal(await verifyCronAuthorization(`Bearer ${REF}.short`, `${REF}.short`, REF), "misconfigured");
  assert.equal(await verifyCronAuthorization(`Bearer ${SECRET}`, SECRET, null), "misconfigured");
  assert.equal(await verifyCronAuthorization(`Bearer ${SECRET}`, SECRET, OTHER_REF), "misconfigured");
  assert.equal(await verifyCronAuthorization(`Bearer ${SECRET}`, `sb_secret_${TOKEN}${TOKEN}`, REF), "misconfigured");
});

test("an ordinary user JWT or a platform API key does not authorize the cron endpoint", async () => {
  assert.equal(await verifyCronAuthorization("Bearer eyJhbGciOiJIUzI1NiJ9.e30.signature", SECRET, REF), "unauthorized");
  assert.equal(await verifyCronAuthorization("Bearer sb_publishable_example", SECRET, REF), "unauthorized");
  assert.equal(await verifyCronAuthorization(`Bearer ${OTHER_REF}.${TOKEN}`, SECRET, REF), "unauthorized");
});

test("the project ref is read only from a canonical https Supabase URL", () => {
  assert.equal(projectRefFromSupabaseUrl(`https://${REF}.supabase.co`), REF);
  assert.equal(projectRefFromSupabaseUrl(`https://${REF}.supabase.co/`), REF);
  for (const bad of [undefined, "", `http://${REF}.supabase.co`, `https://${REF}.supabase.co.evil.com`, `https://x.${REF}.supabase.co`, "http://127.0.0.1:54321", `https://${REF}.supabase.co:8443`]) {
    assert.equal(projectRefFromSupabaseUrl(bad), null, String(bad));
  }
});

test("happy-proactive verifies the cron secret before method, body or database work", async () => {
  const config = await read("supabase/config.toml");
  const section = config.match(/\[functions\.happy-proactive\][^[]*/)?.[0] ?? "";
  assert.match(section, /verify_jwt\s*=\s*false/);
  assert.match(section, /entrypoint\s*=\s*"\.\/functions\/happy-proactive\/index\.ts"/);

  const edge = await read("supabase/functions/happy-proactive/index.ts");
  assert.match(edge, /withSupabase\(\{ auth: "none" \}/);
  assert.doesNotMatch(edge, /auth:\s*"secret"/);
  const handler = edge.slice(edge.indexOf("const happyProactive")).replace(/\/\/[^\n]*/g, "");
  const authAt = handler.indexOf("verifyCronAuthorization(");
  assert.ok(authAt > 0, "handler must call verifyCronAuthorization");
  for (const later of ['request.method', 'request.headers.get("content-length")', "ctx.supabaseAdmin", "request.json", "request.text"]) {
    const at = handler.indexOf(later);
    assert.ok(at === -1 || at > authAt, `${later} must come after the cron authorization`);
  }
  assert.match(handler, /HAPPY_PROACTIVE_CRON_SECRET/);
  assert.match(handler, /projectRefFromSupabaseUrl\(Deno\.env\.get\("SUPABASE_URL"\)\)/);
  assert.match(handler, /status:\s*401/);
  assert.match(handler, /status:\s*503/);
});

test("cron sends the dedicated secret on Authorization and never a platform key header", async () => {
  const latest = await latestInvokerMigration();
  assert.ok(latest, "an invoke_happy_proactive migration must exist");
  const sql = stripComments(latest.sql);
  assert.match(sql, /'Authorization',\s*'Bearer '\s*\|\|\s*cron_secret/);
  assert.doesNotMatch(sql, /'apikey'/);
  assert.match(sql, /timeout_milliseconds\s*:=\s*160000/);
});

test("cron wrapper validates URL and secret shape, fails loudly and is not callable by API roles", async () => {
  const { sql } = await latestInvokerMigration();
  assert.match(sql, /happy_proactive_cron_configuration_missing/);
  assert.match(sql, /happy_proactive_cron_function_url_invalid/);
  assert.match(sql, /happy_proactive_cron_secret_invalid/);
  assert.ok(sql.includes("^https://[a-z]{20}\\.supabase\\.co/functions/v1/happy-proactive$"));
  assert.ok(sql.includes("'^[a-z]{20}\\.[A-Za-z0-9_-]{32,}$'"));
  assert.match(sql, /split_part\(cron_secret, '\.', 1\) <> url_ref/);
  assert.match(sql, /revoke all on function private\.invoke_happy_proactive\(\)\s+from public, anon, authenticated/i);
  assert.match(sql, /security definer\s+set search_path = ''/i);
});

test("the proactive path stays deterministic: no AI, Redis or push provider imports", async () => {
  for (const file of ["index.ts", "cron-auth.ts", "proactive-rules.ts", "occasion-rules.ts", "occasion-domain.ts", "proactivity-policy.ts"]) {
    const source = await read(`supabase/functions/happy-proactive/${file}`);
    assert.doesNotMatch(source, /openai|anthropic|upstash|redis|fcm|apns|fetch\(/i, file);
  }
});

test("Vault secret names are the documented pair and no secret value is in source", async () => {
  const { sql } = await latestInvokerMigration();
  assert.match(sql, /'happy_proactive_function_url'/);
  assert.match(sql, /'happy_proactive_cron_authorization'/);
  assert.doesNotMatch(sql, /sb_secret_[A-Za-z0-9_]{8,}/);
  const edge = await read("supabase/functions/happy-proactive/index.ts");
  assert.doesNotMatch(edge, /sb_secret_[A-Za-z0-9_]{8,}/);
});
