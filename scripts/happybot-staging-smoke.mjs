// HappyBot staging smoke. Runs against a locally started production build (see
// .github/workflows/happybot-staging-smoke.yml). Staging-only credentials come from the
// protected GitHub Environment; values are never printed. Paid calls are capped twice:
// by MAX_CHAT_CALLS here and by the app's own SEC-01 daily budget (OPENAI_DAILY_BUDGET_USD).
import assert from "node:assert/strict";
import process from "node:process";

const BASE = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const SB = (process.env.STAGING_SUPABASE_URL ?? "").replace(/\/$/, "");
const PUB = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY ?? "";
const SRV = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY ?? "";
const MAX_CHAT_CALLS = 8;
const PRODUCT_SEARCH = process.env.GIFT_PRODUCT_SEARCH === "1";

for (const [name, value] of Object.entries({ STAGING_SUPABASE_URL: SB, STAGING_SUPABASE_PUBLISHABLE_KEY: PUB, STAGING_SUPABASE_SERVICE_ROLE_KEY: SRV })) {
  if (!value) throw new Error(`${name} is required`);
}
if (/yzcvdspiiiaidsdripxr/.test(SB)) throw new Error("refusing to run against the production Supabase project");
if (!/xgelazzdgluuenqkymox/.test(SB)) throw new Error("STAGING_SUPABASE_URL is not the expected staging project");

const results = [];
const record = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };
let chatCalls = 0;

async function rest(path, init = {}, key = SRV) {
  const res = await fetch(`${SB}${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) } });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
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
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
    body: JSON.stringify({ message, locale: "uk", conversation, scope: personId ? { type: "person", personId } : { type: "global" }, context: {} }),
    signal: AbortSignal.timeout(90_000),
  });
  return { status: res.status, text: await res.text() };
}

const count = async (table, userId, extra = "") => (await rest(`/rest/v1/${table}?user_id=eq.${userId}&select=id${extra}`)).body.length;
const created = [];

try {
  const a = await createUser("a"); created.push(a.id);
  const b = await createUser("b"); created.push(b.id);
  const pa = (await rest("/rest/v1/people", { method: "POST", body: JSON.stringify({ user_id: a.id, name: "Smoke Husband" }) })).body[0].id;
  const pb = (await rest("/rest/v1/people", { method: "POST", body: JSON.stringify({ user_id: b.id, name: "Smoke Other" }) })).body[0].id;

  // Fallback / validation (no paid call).
  const invalid = await fetch(`${BASE}/api/ai-chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: 42 }) });
  record("invalid body rejected", invalid.status === 400, String(invalid.status));
  const anon = await fetch(`${BASE}/api/ai-chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "hi", conversation: [], scope: { type: "person", personId: pa } }) });
  record("person scope without session rejected", anon.status === 401, String(anon.status));

  // Isolation: B must not reach A's person.
  const cross = await chat(b, "Що ти знаєш про цю людину?", { personId: pa });
  record("user B cannot chat in user A's person scope", cross.status === 404 || cross.status === 401, String(cross.status));

  // Natural chat + memory fact.
  const first = await chat(a, "Мій чоловік любить технології та відеоігри.", { personId: pa });
  record("chat turn 1 ok", first.status === 200 && first.text.length > 0, String(first.status));
  assert(!/system prompt|"role"\s*:/i.test(first.text), "leak of internal structure");

  // New session: empty client conversation, memory must come from the server.
  const recall = await chat(a, "А що ти пам'ятаєш про його інтереси?", { personId: pa });
  record("new session recalls interests", recall.status === 200 && /технолог|відео|ігр|игр|tech|game/i.test(recall.text), String(recall.status));
  record("turns persisted for A only", (await count("happy_chat_turns", a.id)) >= 2 && (await count("happy_chat_turns", b.id)) === 0);

  // Gifts under 200 zł, twice (repeat avoidance).
  const g1 = await chat(a, "Придумай подарунок для нього до 200 zł.", { personId: pa });
  const ideas1 = await rest(`/rest/v1/happy_shown_ideas?user_id=eq.${a.id}&select=title_key,offer_url`);
  record("gift ideas returned and remembered", g1.status === 200 && ideas1.body.length > 0, `ideas=${ideas1.body.length}`);
  const g2 = await chat(a, "Дай ще нові ідеї, інші.", { personId: pa });
  const ideas2 = await rest(`/rest/v1/happy_shown_ideas?user_id=eq.${a.id}&select=title_key,offer_url`);
  const keys = ideas2.body.map((i) => i.title_key);
  record("second request adds new ideas without duplicates", g2.status === 200 && ideas2.body.length >= ideas1.body.length && new Set(keys).size === keys.length);

  // Product search offers (only when enabled).
  const offers = ideas2.body.filter((i) => i.offer_url);
  if (PRODUCT_SEARCH) {
    record("product search: offers are public https without credentials", offers.length > 0 && offers.every((o) => { const u = new URL(o.offer_url); return u.protocol === "https:" && !u.username && !u.password; }), `offers=${offers.length}`);
  } else {
    record("product search disabled: no offers stored", offers.length === 0);
  }

  // Isolation at the data layer through B's own token.
  const bView = await fetch(`${SB}/rest/v1/happy_chat_turns?select=id`, { headers: { apikey: PUB, Authorization: `Bearer ${b.token}` } });
  record("B sees none of A's rows via PostgREST", (await bView.json()).length === 0);
  void pb;
} catch (error) {
  record("smoke aborted", false, error instanceof Error ? error.message : "unknown");
} finally {
  for (const id of created) await rest(`/auth/v1/admin/users/${id}`, { method: "DELETE" }).catch(() => {});
  console.log(`chat calls used: ${chatCalls}/${MAX_CHAT_CALLS}`);
}

if (results.some((r) => !r.ok)) process.exit(1);
