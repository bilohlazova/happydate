// HD-PR-007: the birthday scan must survive PostgREST's URL-length and row-cap
// limits. The emulator below sits behind the real postgrest-js client, so the
// query strings are exactly what the Edge Function sends to the API.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PostgrestClient } from "@supabase/postgrest-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = "supabase/functions/happy-proactive";
const batching = await import(`../${dir}/batching.ts`);
const scan = await import(`../${dir}/birthday-scan.ts`);
const rules = await import(`../${dir}/proactive-rules.ts`);

const NOW = new Date("2026-11-27T09:00:00.000Z");
// sha256 of the authorization block of index.ts, identical on 960982a (the verified variant B).
const AUTH_BLOCK_SHA256 = "5156c896dba6b759c87d21988fa7a95d8c169eb8ac4d3f37c1db296101a4e4ff";
const today = "2026-11-27";
const uuid = (prefix, n) => `${prefix}${n.toString(16).padStart(7, "0")}-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const MODES = ["balanced", "active", "minimal", "balanced", "active", "minimal", "balanced"];
const LOCALES = ["uk", "pl", "en", "de", "ru", "en", "uk"];

// --- PostgREST emulator -----------------------------------------------------
function createDatabase({ urlLimit = 8_000, maxRows = 1_000 } = {}) {
  const db = {
    urlLimit, maxRows,
    events: [], people: [], profiles: [], preferences: [], tasks: [], steps: [], gifts: [], quiet: [],
    ideas: new Map(), notifications: new Map(),
    requests: [], longestUrl: 0, rpcCalls: 0,
    faults: { failRpcAfter: Infinity, failTableOnce: null, failTableAlways: null, failTableNth: null, tableRequests: {} },
  };
  db.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    db.longestUrl = Math.max(db.longestUrl, url.pathname.length + url.search.length);
    if (url.pathname.length + url.search.length > db.urlLimit) throw new TypeError("error sending request: URI too long");
    const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    const name = url.pathname.replace("/rest/v1/", "").replace("/", "");
    db.requests.push(name);
    if (name.startsWith("rpc")) {
      const rpc = url.pathname.split("/").pop();
      db.rpcCalls += 1;
      if (db.rpcCalls > db.faults.failRpcAfter) return json(500, { message: "injected_rpc_failure" });
      const body = JSON.parse(init.body);
      await Promise.resolve();
      if (rpc === "try_create_happy_proactive_birthday_idea") {
        const key = `${body.p_user_id}|birthday:${body.p_rule}:${body.p_event_id}:${body.p_occurrence_date}`;
        if (db.ideas.has(key)) return json(200, false);
        db.ideas.set(key, { user: body.p_user_id, rule: body.p_rule, event: body.p_event_id, locale: body.p_locale });
        return json(200, true);
      }
      const key = `${body.p_user_id}|birthday:gift_missing:${body.p_user_id}:${body.p_event_id}:${body.p_occurrence_date}`;
      if (db.notifications.has(key)) return json(200, false);
      db.notifications.set(key, { user: body.p_user_id, event: body.p_event_id });
      return json(200, true);
    }
    db.faults.tableRequests[name] = (db.faults.tableRequests[name] ?? 0) + 1;
    if (db.faults.failTableNth && db.faults.failTableNth.table === name && db.faults.tableRequests[name] === db.faults.failTableNth.nth) return json(500, { message: "injected_read_failure" });
    if (db.faults.failTableAlways === name || db.faults.failTableOnce === name) {
      if (db.faults.failTableOnce === name) db.faults.failTableOnce = null;
      return json(500, { message: "injected_read_failure" });
    }
    const tables = { events: db.events, happy_tasks: db.tasks, gifts: db.gifts, profiles: db.profiles, happy_proactivity_preferences: db.preferences, happy_task_steps: db.steps, happy_proactive_quiet: db.quiet };
    if (name === "happy_ideas") {
      const keys = listParam(url, "proactive_key");
      return json(200, [...db.ideas].filter(([k, v]) => keys.includes(k.split("|")[1])).map(([k, v]) => ({ user_id: v.user, proactive_key: k.split("|")[1], status: "new" })).slice(0, db.maxRows));
    }
    let rows = [...(tables[name] ?? [])];
    for (const [param, value] of url.searchParams) {
      if (["select", "order", "limit"].includes(param)) continue;
      if (param === "or") {
        const m = /^\(date\.gt\.(\S+?),and\(date\.eq\.\S+?,id\.gt\.(\S+?)\)\)$/.exec(value);
        assert.ok(m, `unexpected or filter ${value}`);
        rows = rows.filter((r) => r.date > m[1] || (r.date === m[1] && r.id > m[2]));
      } else if (value === "not.is.null") rows = rows.filter((r) => r[param] != null);
      else if (value.startsWith("eq.")) rows = rows.filter((r) => String(r[param]) === value.slice(3));
      else if (value.startsWith("gte.")) rows = rows.filter((r) => r[param] >= value.slice(4));
      else if (value.startsWith("lte.")) rows = rows.filter((r) => r[param] <= value.slice(4));
      else if (value.startsWith("in.(")) { const set = value.slice(4, -1).split(","); rows = rows.filter((r) => set.includes(String(r[param]))); }
      else assert.fail(`unsupported filter ${param}=${value}`);
    }
    if (name === "profiles" || name === "happy_proactive_quiet") rows = rows.slice();
    if (url.searchParams.get("order")) rows.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? Infinity), db.maxRows);
    rows = rows.slice(0, limit);
    if (name === "events") rows = rows.map((r) => ({ ...r, people: db.people.find((p) => p.id === r.person_id) ? { id: r.person_id, user_id: db.people.find((p) => p.id === r.person_id).user_id } : null }));
    return json(200, rows);
  };
  db.admin = new PostgrestClient("http://emulator/rest/v1", { fetch: db.fetch });
  return db;
}

function listParam(url, name) {
  const raw = url.searchParams.get(name);
  return raw && raw.startsWith("in.(") ? raw.slice(4, -1).split(",") : [];
}

function seed(db, eventCount, { users = 7 } = {}) {
  for (let u = 0; u < users; u++) {
    db.profiles.push({ id: uuid("a", u), preferred_locale: LOCALES[u % LOCALES.length] });
    if (MODES[u % MODES.length] !== "balanced") db.preferences.push({ user_id: uuid("a", u), mode: MODES[u % MODES.length] });
  }
  for (let i = 0; i < eventCount; i++) {
    const user = uuid("a", i % users);
    const person = uuid("b", i);
    db.people.push({ id: person, user_id: user });
    // Offsets 0..30 are inside the window; every 17th event is also outside it (offset 31) and must be ignored.
    const offset = i % 17 === 16 ? 31 : i % 31;
    const date = new Date(Date.UTC(2026, 10, 27 + offset)).toISOString().slice(0, 10);
    db.events.push({ id: uuid("c", i), user_id: user, person_id: person, date, category: "birthday" });
  }
}

// Independent oracle: the pure rules applied to the whole table at once.
function expected(db) {
  const inWindow = db.events.filter((e) => e.date >= today && e.date <= rules.addUtcCalendarDays(NOW, 30));
  const modeOf = (u) => db.preferences.find((p) => p.user_id === u)?.mode ?? "balanced";
  const ideas = new Set(); const notifications = new Set();
  for (const e of inWindow) {
    const decision = rules.decideBirthdayProactive({ eventId: e.id, userId: e.user_id, personId: e.person_id, occurrenceDate: e.date, personOwnerId: e.user_id, hasActiveTask: false, hasPreparedGift: false, hasGreetingPrepared: false, existingIdeaStatuses: {}, mode: modeOf(e.user_id) }, NOW);
    if (decision.kind !== "process") continue;
    for (const rule of decision.ideaRules) ideas.add(`${e.user_id}|birthday:${rule}:${e.id}:${e.date}`);
    if (decision.notifyGiftMissing) notifications.add(`${e.user_id}|birthday:gift_missing:${e.user_id}:${e.id}:${e.date}`);
  }
  return { candidates: inWindow.length, ideas, notifications };
}

function assertComplete(db, want) {
  assert.deepEqual([...db.ideas.keys()].sort(), [...want.ideas].sort(), "every eligible idea exists exactly once");
  assert.deepEqual([...db.notifications.keys()].sort(), [...want.notifications].sort(), "every gift_missing notification exists exactly once");
}

// --- helpers ----------------------------------------------------------------
test("chunkByEncodedLength keeps order, loses nothing and respects both bounds", () => {
  const values = Array.from({ length: 1_000 }, (_, i) => `birthday:gift_help:${uuid("c", i)}:2026-12-13`);
  const chunks = batching.chunkByEncodedLength(values);
  assert.deepEqual(chunks.flat(), values);
  for (const chunk of chunks) {
    assert.ok(chunk.length <= batching.IN_FILTER_MAX_ITEMS);
    assert.ok(chunk.reduce((sum, v) => sum + encodeURIComponent(v).length + 3, 0) <= batching.IN_FILTER_MAX_ENCODED_CHARS);
  }
  assert.deepEqual(batching.chunkByEncodedLength([]), []);
  assert.deepEqual(batching.chunkByEncodedLength(["x".repeat(10_000)]), [["x".repeat(10_000)]], "an oversize single item is sent alone, not dropped");
});

test("selectInChunks fails loudly on request errors and on a response at the API row cap", async () => {
  await assert.rejects(batching.selectInChunks("t", ["a"], async () => ({ data: null, error: { message: "boom" } })), /proactive_read_failed\.t\.query/);
  await assert.rejects(batching.selectInChunks("t", ["a"], async () => { throw new TypeError("network"); }), /proactive_read_failed\.t\.request/);
  await assert.rejects(batching.selectInChunks("t", ["a"], async () => ({ data: new Array(batching.POSTGREST_MAX_ROWS).fill({}), error: null })), /proactive_read_failed\.t\.row_cap/);
  assert.deepEqual(await batching.selectInChunks("t", [], async () => assert.fail("no request for an empty list")), []);
});

test("event cursor is validated before it is placed in a PostgREST filter", () => {
  assert.throws(() => batching.eventCursorFilter({ date: "2026-11-27", id: "x),or=(id.not.is.null" }), /proactive_read_failed\.events\.cursor/);
  assert.throws(() => batching.eventCursorFilter({ date: "2026-11-27)", id: uuid("c", 1) }), /cursor/);
});

// --- reproduction of the staging failure ------------------------------------
test("emulator reproduces the staging evidence: the legacy single .in() query passes at 30 events and fails at 60", async () => {
  for (const [count, shouldPass] of [[30, true], [60, false]]) {
    const db = createDatabase({ urlLimit: 16_000 });
    seed(db, count);
    const events = db.events;
    const quietKeys = events.flatMap((e) => ["start_gift_planning", "gift_help", "prepare_greeting", "gift_missing"].map((s) => `birthday:${s}:${e.user_id}:${e.id}:${e.date}`));
    const attempt = db.admin.from("happy_proactive_quiet").select("user_id,quiet_key,disposition").in("quiet_key", quietKeys);
    const { error } = await attempt;
    assert.equal(error === null, shouldPass, `${count} events: legacy query ${shouldPass ? "passes" : "fails"}`);
  }
});

// --- fixed scan --------------------------------------------------------------
for (const count of [0, 1, 30, 60, 99, 100, 101, 250, 1_000]) {
  test(`scan processes ${count} events completely under an 8 KB URL limit`, async () => {
    const db = createDatabase({ urlLimit: 8_000 });
    seed(db, count);
    const want = expected(db);
    const summary = await scan.scanBirthdays(db.admin, NOW);
    assert.equal(summary.truncated, false);
    assert.equal(summary.result.scannedCandidates, want.candidates, "no in-window event is skipped (no starvation)");
    assert.equal(summary.pages, Math.ceil(want.candidates / rules.PROACTIVE_MAX_CANDIDATES));
    assertComplete(db, want);
    assert.ok(db.longestUrl <= 8_000, `longest URL ${db.longestUrl}`);
    const created = Object.values(summary.result.ideasCreated).reduce((a, b) => a + b, 0);
    assert.equal(created, want.ideas.size);
    assert.equal(summary.result.notificationsCreated.giftMissing, want.notifications.size);
    // A second run is a no-op.
    const again = await scan.scanBirthdays(db.admin, NOW);
    assert.equal(Object.values(again.result.ideasCreated).reduce((a, b) => a + b, 0), 0);
    assert.equal(again.result.notificationsCreated.giftMissing, 0);
    assert.equal(again.result.skipped.existingIdea, want.ideas.size);
    assertComplete(db, want);
  });
}

test("exactly 100 and exactly 200 in-window events (full last page) lose nothing", async () => {
  for (const target of [100, 200]) {
    const db = createDatabase();
    let total = target;
    for (;;) { db.events.length = 0; db.people.length = 0; db.profiles.length = 0; db.preferences.length = 0; seed(db, total); if (expected(db).candidates >= target) break; total += 1; }
    assert.equal(expected(db).candidates, target);
    const want = expected(db);
    const summary = await scan.scanBirthdays(db.admin, NOW);
    assert.equal(summary.result.scannedCandidates, target);
    assert.equal(summary.pages, target / rules.PROACTIVE_MAX_CANDIDATES);
    assertComplete(db, want);
  }
});

test("concurrent runs on an empty database create every artifact exactly once", async () => {
  const db = createDatabase({ urlLimit: 8_000 });
  seed(db, 250);
  const want = expected(db);
  const runs = await Promise.all(Array.from({ length: 6 }, () => scan.scanBirthdays(db.admin, NOW)));
  assertComplete(db, want);
  const sum = (pick) => runs.reduce((total, run) => total + pick(run.result), 0);
  assert.equal(sum((r) => r.ideasCreated.startGiftPlanning + r.ideasCreated.giftHelp + r.ideasCreated.prepareGreeting), want.ideas.size);
  assert.equal(sum((r) => r.notificationsCreated.giftMissing), want.notifications.size);
});

test("locale and mode come from the profile and preference rows, per user", async () => {
  const db = createDatabase();
  seed(db, 40);
  await scan.scanBirthdays(db.admin, NOW);
  for (const idea of db.ideas.values()) {
    const index = Number.parseInt(idea.user.slice(1, 8), 16);
    assert.equal(idea.locale, LOCALES[index % LOCALES.length]);
    const mode = MODES[index % MODES.length];
    if (idea.rule === "start_gift_planning") assert.equal(mode, "active");
    if (idea.rule === "gift_help") assert.notEqual(mode, "minimal");
  }
});

// --- errors, partial progress, limits ----------------------------------------
test("a read failure on a later page reports the progress made and the next run completes the work", async () => {
  const db = createDatabase();
  seed(db, 250);
  const want = expected(db);
  let eventRequests = 0;
  const originalFetch = db.fetch;
  db.admin = new PostgrestClient("http://emulator/rest/v1", { fetch: async (input, init) => {
    if (new URL(typeof input === "string" ? input : input.url).pathname.endsWith("/events") && ++eventRequests === 2) return new Response(JSON.stringify({ message: "x" }), { status: 500, headers: { "content-type": "application/json" } });
    return originalFetch(input, init);
  } });
  await assert.rejects(scan.scanBirthdays(db.admin, NOW), (error) => {
    assert.equal(error.name, "BirthdayScanError");
    assert.equal(error.cause.name, "ProactiveReadError");
    assert.equal(error.progress.pages, 1);
    assert.equal(error.progress.result.scannedCandidates, rules.PROACTIVE_MAX_CANDIDATES);
    return true;
  });
  const writtenAfterFailure = db.ideas.size;
  assert.ok(writtenAfterFailure > 0 && writtenAfterFailure < want.ideas.size, "page one stayed written, the rest was not");
  db.admin = new PostgrestClient("http://emulator/rest/v1", { fetch: originalFetch });
  await scan.scanBirthdays(db.admin, NOW);
  assertComplete(db, want);
});

test("a write failure in the middle is reported as a scan error and a rerun completes without duplicates", async () => {
  const db = createDatabase();
  seed(db, 120);
  const want = expected(db);
  db.faults.failRpcAfter = 25;
  await assert.rejects(scan.scanBirthdays(db.admin, NOW), (error) => error.name === "BirthdayScanError" && !(error.cause instanceof batching.ProactiveReadError));
  assert.ok(db.ideas.size + db.notifications.size <= 25);
  db.faults.failRpcAfter = Infinity;
  await scan.scanBirthdays(db.admin, NOW);
  assertComplete(db, want);
});

test("the page and time budgets stop the run and flag it as truncated", async () => {
  const db = createDatabase();
  seed(db, 400);
  const byPages = await scan.scanBirthdays(db.admin, NOW, { maxPages: 2 });
  assert.equal(byPages.truncated, true);
  assert.equal(byPages.pages, 2);
  let ticks = 0;
  const byTime = await scan.scanBirthdays(db.admin, NOW, { timeBudgetMs: 10, clock: () => (ticks += 8) });
  assert.equal(byTime.truncated, true);
  assert.ok(byTime.pages >= 1);
});

test("a non-full first page is a single page and an event outside the window is never read", async () => {
  const db = createDatabase();
  seed(db, 12);
  const summary = await scan.scanBirthdays(db.admin, NOW);
  assert.equal(summary.pages, 1);
  assert.equal(summary.result.scannedCandidates, expected(db).candidates);
});

// --- authorization, RLS and isolation must be unchanged -----------------------
test("authorization code is byte-identical to the verified variant B", async () => {
  const cronAuth = await readFile(path.join(root, dir, "cron-auth.ts"), "utf8");
  assert.equal(createHash("sha256").update(cronAuth).digest("hex"), "2eaf6cf04cd46df35df8a736a055442ea7e41aa7c8c1c072e69dae99aa1391ea");
  const index = await readFile(path.join(root, dir, "index.ts"), "utf8");
  const start = index.indexOf("fetch: withSupabase");
  const end = index.indexOf("const now = new Date();");
  const block = index.slice(start, end);
  assert.equal(createHash("sha256").update(block).digest("hex"), AUTH_BLOCK_SHA256);
  // The admin client is only touched after the block above (comments excluded).
  const code = index.split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
  assert.equal(code.split("ctx.supabaseAdmin").length - 1, 1);
  assert.ok(code.indexOf("ctx.supabaseAdmin") > code.indexOf("const now = new Date();"));
});

test("the function sources contain no SQL, RLS, grant or auth-admin operations", async () => {
  // Static and history-independent: a git diff against a fixed commit breaks as
  // soon as the branch is rebased onto main or cloned shallowly in CI.
  for (const file of ["index.ts", "batching.ts", "birthday-scan.ts", "cron-auth.ts"]) {
    const source = (await readFile(path.join(root, dir, file), "utf8")).split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
    assert.doesNotMatch(source, /\b(create|alter|drop)\s+(table|policy|function|role)\b|\bgrant\b|\brevoke\b|auth\.admin|service_role/i, file);
  }
});

test("the scan module issues only reads against the existing tables and the two existing RPCs", async () => {
  const source = await readFile(path.join(root, dir, "birthday-scan.ts"), "utf8");
  assert.doesNotMatch(source, /\.(insert|update|upsert|delete)\(/);
  assert.deepEqual([...new Set([...source.matchAll(/\.rpc\("([a-z_]+)"/g)].map((m) => m[1]))].sort(), ["try_create_happy_proactive_birthday_gift_missing_notification", "try_create_happy_proactive_birthday_idea"]);
  assert.doesNotMatch(source, /fetch\(|https?:\/\//);
});

test("read and write failures are reported with distinct, generic error codes and counts only", async () => {
  const index = await readFile(path.join(root, dir, "index.ts"), "utf8");
  assert.match(index, /proactive_read_failed/);
  assert.match(index, /proactive_write_failed/);
  const failureLog = index.slice(index.indexOf('event: "happy_proactive_failed"'), index.indexOf("return Response.json({ error: readFailure"));
  assert.doesNotMatch(failureLog, /error\.message|stack|user_id|email|name:/);
});

// --- partial failures: every failure position, then a rerun -------------------
test("rerun after a write failure at EVERY RPC position completes without gaps or duplicates", async () => {
  const probe = createDatabase();
  seed(probe, 45);
  await scan.scanBirthdays(probe.admin, NOW);
  const totalRpc = probe.rpcCalls;
  assert.ok(totalRpc > 30, `expected a meaningful number of writes, got ${totalRpc}`);
  for (let failAfter = 0; failAfter < totalRpc; failAfter++) {
    const db = createDatabase();
    seed(db, 45);
    const want = expected(db);
    db.faults.failRpcAfter = failAfter;
    await assert.rejects(scan.scanBirthdays(db.admin, NOW), (error) => error.name === "BirthdayScanError" && !(error.cause instanceof batching.ProactiveReadError), `failure after ${failAfter} writes is reported`);
    assert.ok(db.ideas.size + db.notifications.size <= failAfter, "nothing is written past the failure");
    db.faults.failRpcAfter = Infinity;
    const rerun = await scan.scanBirthdays(db.admin, NOW);
    assertComplete(db, want);
    assert.equal(rerun.truncated, false);
  }
});

test("rerun after a read failure of EACH table, on the first and on the second page, completes", async () => {
  for (const table of ["events", "happy_tasks", "gifts", "profiles", "happy_proactivity_preferences", "happy_ideas", "happy_proactive_quiet"]) {
    for (const nth of [1, 2]) {
      const db = createDatabase();
      seed(db, 140); // two pages of in-window events
      const want = expected(db);
      assert.ok(want.candidates > rules.PROACTIVE_MAX_CANDIDATES);
      db.faults.failTableNth = { table, nth };
      await assert.rejects(scan.scanBirthdays(db.admin, NOW), (error) => error.name === "BirthdayScanError" && error.cause.name === "ProactiveReadError" && error.cause.table === table, `${table} request ${nth}`);
      if (nth === 2 && table !== "happy_tasks") { /* page one was fully processed before the failure */ }
      db.faults.failTableNth = null;
      await scan.scanBirthdays(db.admin, NOW);
      assertComplete(db, want);
    }
  }
});

test("partial failure in the middle of a candidate (idea written, notification not) is completed by the next run", async () => {
  const db = createDatabase();
  seed(db, 31); // offsets 0..30
  const want = expected(db);
  // Fail on the notification RPC only.
  const originalFetch = db.fetch;
  let failed = 0;
  db.admin = new PostgrestClient("http://emulator/rest/v1", { fetch: async (input, init) => {
    if (String(typeof input === "string" ? input : input.url).includes("gift_missing_notification") && failed++ === 0) return new Response(JSON.stringify({ message: "x" }), { status: 500, headers: { "content-type": "application/json" } });
    return originalFetch(input, init);
  } });
  await assert.rejects(scan.scanBirthdays(db.admin, NOW), (error) => error.name === "BirthdayScanError");
  assert.ok(db.ideas.size > 0 && db.notifications.size < want.notifications.size);
  db.admin = new PostgrestClient("http://emulator/rest/v1", { fetch: originalFetch });
  await scan.scanBirthdays(db.admin, NOW);
  assertComplete(db, want);
});

// --- keyset pagination: no event is skipped or read twice ---------------------
function trackedClient(db, hooks = {}) {
  const pages = [];
  const client = new PostgrestClient("http://emulator/rest/v1", { fetch: async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    const isEvents = url.pathname.endsWith("/events");
    if (isEvents) hooks.beforeEventPage?.(pages.length + 1);
    const response = await db.fetch(input, init);
    if (isEvents) pages.push((await response.clone().json()).map((row) => row.id));
    return response;
  } });
  return { client, pages };
}

test("keyset pagination reads every in-window event exactly once, with random ids and heavy date ties", async () => {
  const { randomUUID } = await import("node:crypto");
  for (const shape of ["all-same-date", "few-dates", "spread"]) {
    const db = createDatabase();
    db.profiles.push({ id: uuid("a", 0), preferred_locale: "en" });
    for (let i = 0; i < 1_037; i++) {
      const person = randomUUID();
      db.people.push({ id: person, user_id: uuid("a", 0) });
      const offset = shape === "all-same-date" ? 9 : shape === "few-dates" ? i % 3 : i % 31;
      const date = new Date(Date.UTC(2026, 10, 27 + offset)).toISOString().slice(0, 10);
      db.events.push({ id: randomUUID(), user_id: uuid("a", 0), person_id: person, date, category: "birthday" });
    }
    const { client, pages } = trackedClient(db);
    const summary = await scan.scanBirthdays(client, NOW);
    const seen = pages.flat();
    assert.equal(new Set(seen).size, seen.length, `${shape}: no event is read twice`);
    assert.deepEqual([...seen].sort(), db.events.map((e) => e.id).sort(), `${shape}: no event is skipped`);
    assert.equal(summary.result.scannedCandidates, 1_037);
    assert.equal(pages.length, 11, "10 full pages, then a last page of 37");
    // pages are globally ordered by (date, id)
    const order = seen.map((id) => db.events.find((e) => e.id === id)).map((e) => `${e.date}|${e.id}`);
    assert.deepEqual(order, [...order].sort());
  }
});

test("deleting events that were already read does not shift the next page (an offset scan would skip them)", async () => {
  const db = createDatabase();
  seed(db, 400);
  const inWindow = expected(db).candidates;
  const { client, pages } = trackedClient(db, { beforeEventPage(page) {
    if (page === 2) { const doomed = new Set(pages[0].slice(0, 60)); db.events = db.events.filter((e) => !doomed.has(e.id)); }
  } });
  await scan.scanBirthdays(client, NOW);
  const seen = pages.flat();
  assert.equal(new Set(seen).size, seen.length);
  assert.equal(seen.length, inWindow, "every event that existed at the start was read exactly once");
});

test("events inserted during a run are never read twice, and events that existed at the start are never skipped", async () => {
  const db = createDatabase();
  seed(db, 400);
  const startIds = new Set(db.events.filter((e) => e.date >= today && e.date <= rules.addUtcCalendarDays(NOW, 30)).map((e) => e.id));
  let n = 0;
  const { client, pages } = trackedClient(db, { beforeEventPage(page) {
    if (page !== 2) return;
    for (const offset of [0, 1, 15, 30]) { // earlier and later than the cursor
      const date = new Date(Date.UTC(2026, 10, 27 + offset)).toISOString().slice(0, 10);
      const person = uuid("d", ++n);
      db.people.push({ id: person, user_id: uuid("a", 0) });
      db.events.push({ id: uuid("e", n), user_id: uuid("a", 0), person_id: person, date, category: "birthday" });
    }
  } });
  await scan.scanBirthdays(client, NOW);
  const seen = pages.flat();
  assert.equal(new Set(seen).size, seen.length, "no event is read twice");
  for (const id of startIds) assert.ok(seen.includes(id), "an event that existed at the start was skipped");
  // The next run picks up whatever the first run could not see.
  const next = trackedClient(db);
  await scan.scanBirthdays(next.client, NOW);
  assert.equal(next.pages.flat().length, expected(db).candidates);
});
