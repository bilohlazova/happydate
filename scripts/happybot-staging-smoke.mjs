// HappyBot staging smoke. Runs against a locally started production build (see
// .github/workflows/happybot-staging-smoke.yml). Staging-only credentials come from the
// protected GitHub Environment; values are never printed and no model text is logged.
// Paid calls are capped three ways: MAX_CHAT_CALLS here, the app's SEC-01 daily budget
// (OPENAI_DAILY_BUDGET_USD=0.10 on a throw-away Redis) and the OpenAI Project spend limit.
import assert from "node:assert/strict";
import process from "node:process";

const BASE = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const SB = (process.env.STAGING_SUPABASE_URL ?? "").replace(/\/$/, "");
const PUB = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY ?? "";
const SRV = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY ?? "";
const REDIS_REST = process.env.UPSTASH_REDIS_REST_URL ?? "";
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
const MAX_CHAT_CALLS = 12;
const LEASE_SECONDS = 75;
const PRODUCT_SEARCH = process.env.GIFT_PRODUCT_SEARCH === "1";

for (const [name, value] of Object.entries({ STAGING_SUPABASE_URL: SB, STAGING_SUPABASE_PUBLISHABLE_KEY: PUB, STAGING_SUPABASE_SERVICE_ROLE_KEY: SRV, UPSTASH_REDIS_REST_URL: REDIS_REST, UPSTASH_REDIS_REST_TOKEN: REDIS_TOKEN })) {
  if (!value) throw new Error(`${name} is required`);
}
if (/yzcvdspiiiaidsdripxr/.test(SB)) throw new Error("refusing to run against the production Supabase project");
if (!/^https:\/\/xgelazzdgluuenqkymox\.supabase\.co$/.test(SB)) throw new Error("STAGING_SUPABASE_URL is not the expected staging project");
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(REDIS_REST)) throw new Error("UPSTASH_REDIS_REST_URL must be the local bridge, never a real Upstash database");

const results = [];
const record = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };
let chatCalls = 0;

async function rest(path, init = {}, key = SRV, bearer = key) {
  const res = await fetch(`${SB}${path}`, { ...init, signal: AbortSignal.timeout(20_000), headers: { apikey: key, Authorization: `Bearer ${bearer}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) } });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const redis = async (...command) => (await (await fetch(REDIS_REST, { method: "POST", headers: { Authorization: `Bearer ${REDIS_TOKEN}` }, body: JSON.stringify(command), signal: AbortSignal.timeout(5000) })).json()).result;

// People are created as the user (service_role has SELECT only on people by design).
async function createPerson(user, name) {
  const res = await rest("/rest/v1/people", { method: "POST", body: JSON.stringify({ user_id: user.id, name }) }, PUB, user.token);
  assert(res.status === 201 && Array.isArray(res.body) && res.body[0]?.id, `create person failed: status=${res.status} code=${res.body?.code ?? "n/a"}`);
  return res.body[0].id;
}

async function createUser(tag) {
  const email = `happybot-smoke-${tag}-${Date.now()}@example.test`;
  const password = `Sm0ke-${crypto.randomUUID()}`;
  const created = await rest("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  assert.equal(created.status, 200, `create user ${tag}`);
  const token = await rest("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }, PUB);
  assert.equal(token.status, 200, `sign in ${tag}`);
  return { id: created.body.id, token: token.body.access_token };
}

async function chat(user, message, { personId = null, conversation = [] } = {}) {
  if (++chatCalls > MAX_CHAT_CALLS) throw new Error("chat call cap reached; aborting to protect the budget");
  const res = await fetch(`${BASE}/api/ai-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(user ? { Authorization: `Bearer ${user.token}` } : {}) },
    body: JSON.stringify({ message, locale: "uk", conversation, scope: personId ? { type: "person", personId } : { type: "global" }, context: {} }),
    signal: AbortSignal.timeout(90_000),
  });
  return { status: res.status, text: await res.text() };
}

const ids = [];
const ideasOf = async (userId) => (await rest(`/rest/v1/happy_shown_ideas?user_id=eq.${userId}&select=title_key,estimated_price,currency,offer_url`)).body;
const countRows = async (table, userId) => (await rest(`/rest/v1/${table}?user_id=eq.${userId}&select=id`)).body.length;

try {
  const a = await createUser("a"); ids.push(a.id);
  const b = await createUser("b"); ids.push(b.id);
  const pa = await createPerson(a, "Smoke Husband");
  const pb = await createPerson(b, "Smoke Other");

  // --- No-cost checks: validation, auth, API-level isolation -------------------------------
  const invalid = await fetch(`${BASE}/api/ai-chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: 42 }) });
  record("invalid body rejected", invalid.status === 400, String(invalid.status));
  const anon = await chat(null, "hi", { personId: pa });
  record("person scope without session rejected", anon.status === 401, String(anon.status));
  const forged = await chat({ token: "not-a-real-token" }, "hi", { personId: pa });
  record("forged bearer token rejected", forged.status === 401, String(forged.status));
  const cross = await chat(b, "Що ти знаєш про цю людину?", { personId: pa });
  record("API: user B cannot use user A's person scope", cross.status === 404 || cross.status === 401, String(cross.status));
  const crossEvent = await fetch(`${BASE}/api/ai-chat`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${b.token}` }, body: JSON.stringify({ message: "hi", conversation: [], scope: { type: "event", eventId: crypto.randomUUID() }, context: {} }) });
  record("API: unknown event scope is not found", crossEvent.status === 404, String(crossEvent.status));

  // --- Concurrency lease: 3 simultaneous requests, 2 slots ---------------------------------
  const inflight = [1, 2, 3].map(() => chat(a, "Привіт! Допоможеш придумати подарунок для мого чоловіка?", { personId: pa }));
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const lockKeys = (await redis("KEYS", "assistant:active:*")) ?? [];
  const ttls = await Promise.all(lockKeys.map((key) => redis("TTL", key)));
  const settled = await Promise.all(inflight);
  const statuses = settled.map((r) => r.status).sort();
  record("concurrency: at most 2 of 3 simultaneous AI requests proceed", statuses.filter((s) => s === 200).length <= 2 && statuses.includes(429), statuses.join(","));
  record(`lease: lock held during the request with TTL <= ${LEASE_SECONDS}s`, lockKeys.length >= 1 && ttls.every((t) => t > 0 && t <= LEASE_SECONDS), `locks=${lockKeys.length} ttl=${ttls.join("/")}`);
  // Release runs in the stream's finally block and may land just after the HTTP body ends; it must
  // still happen within seconds, far below the 75 s lease, or a user would be locked out.
  const releaseStart = Date.now();
  let remaining = (await redis("KEYS", "assistant:active:*")) ?? [];
  while (remaining.length && Date.now() - releaseStart < 10_000) { await new Promise((resolve) => setTimeout(resolve, 500)); remaining = (await redis("KEYS", "assistant:active:*")) ?? []; }
  record("lease: locks released within 10s after the requests finish", remaining.length === 0, `${Date.now() - releaseStart}ms`);
  record("natural reply is plain text without internals", settled.some((r) => r.status === 200 && r.text.length > 0 && !/system prompt|"role"\s*:/i.test(r.text)));

  // --- Memory ------------------------------------------------------------------------------
  const first = await chat(a, "Мій чоловік любить технології та відеоігри.", { personId: pa });
  record("memory: fact statement accepted", first.status === 200, String(first.status));
  const recall = await chat(a, "А що ти пам'ятаєш про його інтереси?", { personId: pa }); // empty client conversation = new session
  record("memory: new session recalls interests from the server", recall.status === 200 && /технолог|відео|ігр|игр|tech|game/i.test(recall.text), String(recall.status));
  record("memory: turns stored for A only", (await countRows("happy_chat_turns", a.id)) >= 2 && (await countRows("happy_chat_turns", b.id)) === 0);

  // --- Gifts: budget, novelty ---------------------------------------------------------------
  const g1 = await chat(a, "Придумай подарунок для нього до 200 zł.", { personId: pa });
  const ideas1 = await ideasOf(a.id);
  record("gifts: first batch returned and remembered", g1.status === 200 && ideas1.length > 0, `ideas=${ideas1.length}`);
  const g2 = await chat(a, "Дай ще нові ідеї, інші, не повторюй попередні.", { personId: pa });
  const ideas2 = await ideasOf(a.id);
  const before = new Set(ideas1.map((i) => i.title_key));
  const freshKeys = ideas2.map((i) => i.title_key).filter((key) => !before.has(key));
  record("gifts: second batch brings new ideas, none duplicated", g2.status === 200 && freshKeys.length >= 1 && new Set(ideas2.map((i) => i.title_key)).size === ideas2.length, `new=${freshKeys.length}`);
  const priced = ideas2.filter((i) => i.estimated_price !== null);
  record("gifts: every stated price is within 200 and in PLN", priced.every((i) => Number(i.estimated_price) <= 200 && (i.currency === null || /^(PLN|zł|zl)$/i.test(i.currency))), `priced=${priced.length}/${ideas2.length}`);

  const offers = ideas2.filter((i) => i.offer_url);
  if (PRODUCT_SEARCH) {
    record("search: offers are public https without credentials", offers.length > 0 && offers.every((o) => { const u = new URL(o.offer_url); return u.protocol === "https:" && !u.username && !u.password && !/^(localhost|127\.|10\.|192\.168\.)/.test(u.hostname); }), `offers=${offers.length}`);
  } else {
    record("search disabled: no offers stored", offers.length === 0);
  }

  // --- Data-layer isolation through B's own token -------------------------------------------
  for (const table of ["happy_chat_turns", "happy_conversation_summaries", "happy_shown_ideas"]) {
    const view = await fetch(`${SB}/rest/v1/${table}?select=id`, { headers: { apikey: PUB, Authorization: `Bearer ${b.token}` } });
    record(`isolation: B sees none of A's rows in ${table}`, (await view.json()).length === 0);
  }
  void pb;
} catch (error) {
  record("smoke aborted", false, error instanceof Error ? error.message : "unknown");
} finally {
  console.log(`chat calls used: ${chatCalls}/${MAX_CHAT_CALLS}`);
  for (const id of ids) await rest(`/auth/v1/admin/users/${id}`, { method: "DELETE" }).catch(() => {});
  // Cleanup must be proven, not assumed: user gone, and every owned row cascaded away.
  let clean = ids.length > 0;
  for (const id of ids) {
    clean &&= (await rest(`/auth/v1/admin/users/${id}`)).status === 404;
    for (const table of ["happy_chat_turns", "happy_conversation_summaries", "happy_shown_ideas", "people"]) clean &&= (await countRows(table, id)) === 0;
  }
  record("cleanup: test users and all their rows are gone", clean);
}

if (results.some((r) => !r.ok)) process.exit(1);
