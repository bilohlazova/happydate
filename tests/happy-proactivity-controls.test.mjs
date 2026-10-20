import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const policy = await import("../supabase/functions/happy-proactive/proactivity-policy.ts");
const rules = await import("../supabase/functions/happy-proactive/proactive-rules.ts");
const migration = await readFile(path.join(root, "supabase/migrations/20261012181028_proactivity_controls_quiet_semantics.sql"), "utf8");
const settingsRoute = await readFile(path.join(root, "src/app/api/happy/preferences/proactivity/route.ts"), "utf8");
const quietRoute = await readFile(path.join(root, "src/app/api/happy/proactive/[id]/[disposition]/route.ts"), "utf8");

const now = new Date("2026-09-28T10:00:00.000Z");
const base = (overrides = {}) => ({
  eventId: "11111111-1111-4111-8111-111111111111", userId: "22222222-2222-4222-8222-222222222222", personId: "33333333-3333-4333-8333-333333333333", occurrenceDate: "2026-10-28", personOwnerId: "22222222-2222-4222-8222-222222222222", locale: "uk", hasActiveTask: false, hasPreparedGift: false, hasGreetingPrepared: false, existingIdeaStatuses: {}, ...overrides,
});

test("mode schema defaults missing values to balanced and rejects unknown values", () => {
  assert.equal(policy.normalizeProactivityMode(undefined), "balanced");
  assert.deepEqual(policy.PROACTIVITY_MODES, ["minimal", "balanced", "active"]);
  assert.equal(policy.normalizeProactivityMode("loud"), "balanced");
});

test("birthday signal mode matrix is deterministic", () => {
  for (const mode of ["minimal", "balanced", "active"]) {
    assert.equal(policy.isSignalAllowedByMode(mode, "gift_missing"), true);
    assert.equal(policy.isSignalAllowedByMode(mode, "prepare_greeting"), true);
  }
  assert.equal(policy.isSignalAllowedByMode("minimal", "gift_help"), false);
  assert.equal(policy.isSignalAllowedByMode("balanced", "gift_help"), true);
  assert.equal(policy.isSignalAllowedByMode("minimal", "start_gift_planning"), false);
  assert.equal(policy.isSignalAllowedByMode("balanced", "start_gift_planning"), false);
  assert.equal(policy.isSignalAllowedByMode("active", "start_gift_planning"), true);
});

test("pure birthday evaluator applies mode and quiet without mutating facts", () => {
  assert.deepEqual(rules.decideBirthdayProactive(base({ mode: "active" }), now).ideaRules, ["start_gift_planning"]);
  assert.deepEqual(rules.decideBirthdayProactive(base({ mode: "balanced" }), now).ideaRules, []);
  assert.deepEqual(rules.decideBirthdayProactive(base({ mode: "minimal" }), now).ideaRules, []);
  const help = rules.decideBirthdayProactive(base({ occurrenceDate: "2026-10-03", mode: "minimal" }), now);
  assert.deepEqual(help.ideaRules, []);
  assert.equal(help.notifyGiftMissing, true);
  const quiet = rules.decideBirthdayProactive(base({ occurrenceDate: "2026-10-08", mode: "active", quietSignals: { gift_help: true, gift_missing: true } }), now);
  assert.deepEqual(quiet.ideaRules, []);
  assert.equal(quiet.notifyGiftMissing, false);
  assert.equal(quiet.kind, "process");
});

test("quiet keys are occurrence and milestone scoped", () => {
  const first = policy.proactiveQuietKey({ userId: "u", eventId: "e", occurrenceDate: "2026-10-28", signal: "gift_help" });
  assert.equal(first, "birthday:gift_help:e:2026-10-28");
  assert.notEqual(first, policy.proactiveQuietKey({ userId: "u", eventId: "e", occurrenceDate: "2027-10-28", signal: "gift_help" }));
  assert.notEqual(first, policy.proactiveQuietKey({ userId: "u", eventId: "e", occurrenceDate: "2026-10-28", signal: "gift_missing" }));
  assert.deepEqual(policy.evaluateProactiveEligibility({ mode: "active", signal: "gift_help", quiet: true }), { eligible: false, reason: "quiet_same_milestone" });
});

test("durable controls are owner-scoped and quiet writes are server-derived", () => {
  assert.match(migration, /create table public\.happy_proactivity_preferences/);
  assert.match(migration, /mode text not null default 'balanced'/);
  assert.match(migration, /happy_proactivity_preferences_mode_check/);
  assert.match(migration, /create table public\.happy_proactive_quiet/);
  assert.match(migration, /primary key \(user_id, quiet_key\)/);
  assert.match(migration, /revoke all on table public\.happy_proactive_quiet from anon, authenticated, public/);
  assert.match(settingsRoute, /\.strict\(\)/);
  assert.doesNotMatch(settingsRoute, /quiet_key|signal/);
  assert.doesNotMatch(quietRoute, /request\.json/);
  assert.match(quietRoute, /quietHappyProactiveItem/);
});

test("proactive path remains deterministic and provider-free", async () => {
  const source = await readFile(path.join(root, "supabase/functions/happy-proactive/index.ts"), "utf8");
  assert.doesNotMatch(source, /openai|happyAgentProvider|\/api\/happy\/agent/i);
  assert.match(source, /happy_proactivity_preferences/);
  assert.match(source, /happy_proactive_quiet/);
  assert.match(source, /limit\(PROACTIVE_MAX_CANDIDATES\)/);
});
