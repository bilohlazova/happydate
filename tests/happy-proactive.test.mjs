import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rules = await import("../supabase/functions/happy-proactive/proactive-rules.ts");
const migration = await readFile(path.join(root, "supabase/migrations/20260928080935_add_happy_proactive_birthday_dedupe_and_cron.sql"), "utf8");
const functionSource = await readFile(path.join(root, "supabase/functions/happy-proactive/index.ts"), "utf8");

const now = new Date("2026-09-28T10:00:00.000Z");
const candidate = (overrides = {}) => ({
  eventId: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  personId: "33333333-3333-4333-8333-333333333333",
  occurrenceDate: "2026-10-12",
  personOwnerId: "22222222-2222-4222-8222-222222222222",
  hasActiveTask: false,
  hasPreparedGift: false,
  existingIdeaStatus: null,
  ...overrides,
});

function writer() {
  const ideas = new Set();
  const notifications = new Set();
  return {
    ideas,
    notifications,
    createIdea: async (_candidate, key) => {
      if (ideas.has(key)) return false;
      ideas.add(key);
      return true;
    },
    createNotification: async (_candidate, key) => {
      if (notifications.has(key)) return false;
      notifications.add(key);
      return true;
    },
  };
}

test("birthday 14 days away creates one deterministic proactive Idea", async () => {
  const db = writer();
  const result = await rules.runBirthdayProactive([candidate()], now, db);
  assert.equal(result.ideasCreated, 1);
  assert.equal(result.notificationsCreated, 0);
  assert.equal(db.ideas.size, 1);
});

test("repeat invocation and concurrent writers remain idempotent", async () => {
  const db = writer();
  const input = [candidate()];
  const [first, second] = await Promise.all([
    rules.runBirthdayProactive(input, now, db),
    rules.runBirthdayProactive(input, now, db),
  ]);
  assert.equal(first.ideasCreated + second.ideasCreated, 1);
  assert.equal(db.ideas.size, 1);
  assert.match(migration, /unique\s*\(user_id, proactive_key\)/i);
});

test("birthday within seven days creates one notification with a separate stable key", async () => {
  const db = writer();
  const input = candidate({ occurrenceDate: "2026-10-05" });
  const first = await rules.runBirthdayProactive([input], now, db);
  const second = await rules.runBirthdayProactive([input], now, db);
  assert.deepEqual([first.ideasCreated, first.notificationsCreated], [1, 1]);
  assert.deepEqual([second.ideasCreated, second.notificationsCreated], [0, 0]);
  assert.equal(db.notifications.size, 1);
  assert.notEqual(rules.proactiveIdeaKey(input), rules.proactiveNotificationKey(input));
});

test("active task or prepared selected/purchased gift suppresses both proactive rows", async () => {
  for (const input of [candidate({ hasActiveTask: true }), candidate({ hasPreparedGift: true })]) {
    const decision = rules.decideBirthdayProactive(input, now);
    assert.equal(decision.kind, "skip");
    assert.ok(["taskExists", "giftPrepared"].includes(decision.reason));
  }
  assert.match(functionSource, /in\("lifecycle", \["selected", "purchased"\]\)/);
  assert.match(functionSource, /in\("status", \["active", "waiting_user", "paused"\]\)/);
});

test("new, shown, accepted, dismissed and expired ideas are never resurrected for the same occurrence", () => {
  for (const status of ["new", "shown", "accepted", "dismissed", "expired"]) {
    const decision = rules.decideBirthdayProactive(candidate({ existingIdeaStatus: status }), now);
    assert.equal(decision.kind, "process");
    assert.equal(decision.ideaKey, null);
    assert.equal(decision.ideaExists, true);
  }
});

test("terminal proactive keys remain reserved and occurrence-specific notification keys do not collide", async () => {
  for (const status of ["accepted", "dismissed", "expired"]) {
    const db = writer();
    const result = await rules.runBirthdayProactive([candidate({
      occurrenceDate: "2026-10-05",
      existingIdeaStatus: status,
    })], now, db);
    assert.deepEqual([result.ideasCreated, result.notificationsCreated], [0, 1]);
    assert.equal(db.ideas.size, 0);
  }

  const sevenDays = candidate({ occurrenceDate: "2026-10-05" });
  const eightDays = candidate({ occurrenceDate: "2026-10-06" });
  assert.notEqual(rules.proactiveNotificationKey(sevenDays), rules.proactiveNotificationKey(eightDays));
  assert.match(migration, /on conflict \(user_id, proactive_key\) do nothing/i);
  assert.match(migration, /on conflict \(user_id, dedupe_key\) do nothing/i);
});

test("foreign ownership, outside-window and malformed candidates are skipped without writes", () => {
  assert.equal(rules.decideBirthdayProactive(candidate({ personOwnerId: "other-user" }), now).reason, "invalidTarget");
  assert.equal(rules.decideBirthdayProactive(candidate({ occurrenceDate: "2026-10-13" }), now).reason, "invalidTarget");
  assert.equal(rules.decideBirthdayProactive(candidate({ occurrenceDate: "not-a-date" }), now).reason, "invalidTarget");
});

test("users and birthday occurrences have independent semantic identities", () => {
  const base = candidate();
  assert.notEqual(rules.proactiveIdeaKey(base), rules.proactiveIdeaKey(candidate({ userId: "44444444-4444-4444-8444-444444444444" })));
  assert.notEqual(rules.proactiveIdeaKey(base), rules.proactiveIdeaKey(candidate({ occurrenceDate: "2027-10-12" })));
});

test("no candidates is a clean no-op with aggregate-only diagnostics", async () => {
  const result = await rules.runBirthdayProactive([], now, writer());
  assert.deepEqual(result, {
    scannedCandidates: 0,
    ideasCreated: 0,
    notificationsCreated: 0,
    skipped: { taskExists: 0, giftPrepared: 0, ideaExists: 0, invalidTarget: 0 },
  });
});

test("candidate scan is birthday-only and bounded to one hundred rows", () => {
  assert.equal(rules.PROACTIVE_MAX_CANDIDATES, 100);
  assert.match(functionSource, /\.eq\("category", "birthday"\)/);
  assert.match(functionSource, /\.limit\(PROACTIVE_MAX_CANDIDATES\)/);
});

test("Edge Function request boundary fails closed for non-POST and non-empty payloads", () => {
  assert.match(functionSource, /request\.method !== "POST"[\s\S]*?status: 405/);
  assert.match(functionSource, /contentLength > 2[\s\S]*?status: 400/);
  assert.match(migration, /body := '\{\}'::jsonb/);
});

test("scheduled invocation fails closed when required Vault configuration is absent", () => {
  assert.match(migration, /function_url is null or cron_authorization is null/);
  assert.match(migration, /happy_proactive_cron_configuration_missing/);
  assert.match(migration, /vault\.decrypted_secrets/);
});

test("cron is explicit, Vault-backed, and Edge Function has no AI/provider path", () => {
  assert.match(migration, /'0 \*\/2 \* \* \*'/);
  assert.match(migration, /happydate-happy-proactive-every-two-hours/);
  assert.match(migration, /vault\.decrypted_secrets/);
  assert.match(migration, /net\.http_post/);
  assert.match(functionSource, /withSupabase\(\{ auth: "secret" \}/);
  assert.match(functionSource, /\.eq\("category", "birthday"\)/);
  assert.match(functionSource, /try_create_happy_proactive_birthday_idea/);
  assert.doesNotMatch(functionSource, /openai|happyAgentProvider|\/api\/happy\/agent|structured.?output/i);
  assert.doesNotMatch(`${functionSource}\n${migration}`, /console\.(log|error)\([^)]*(title|message|name|note|memory|knowledge)/i);
});
