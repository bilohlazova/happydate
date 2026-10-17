import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const rules = await import("../supabase/functions/happy-proactive/occasion-rules.ts");
const policy = await import("../supabase/functions/happy-proactive/proactivity-policy.ts");
const edge = await readFile(new URL("../supabase/functions/happy-proactive/index.ts", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/20261015133000_add_generic_occasion_proactive_writer.sql", import.meta.url), "utf8");

const candidate = (overrides = {}) => ({ userId: "u1", occasionKey: "pl_boys_day", occurrenceKey: "occasion:pl_boys_day:2026", personId: "11111111-1111-4111-8111-111111111111", phase: "planning", readiness: "needs_action", quiet: false, mode: "active", ...overrides });

test("Occasion background uses semantic milestone identity and mode gates", () => {
  assert.equal(rules.decideOccasionBackground(candidate()).kind, "emit");
  assert.match(rules.decideOccasionBackground(candidate()).dedupeKey, /occasion:pl_boys_day:2026:11111111-1111-4111-8111-111111111111:planning/);
  assert.equal(rules.decideOccasionBackground(candidate({ mode: "balanced" })).kind, "skip");
  assert.equal(rules.decideOccasionBackground(candidate({ phase: "preparing", mode: "balanced" })).kind, "emit");
  assert.equal(rules.decideOccasionBackground(candidate({ phase: "urgent", mode: "minimal" })).artifact, "notification");
  assert.equal(rules.decideOccasionBackground(candidate({ phase: "today", mode: "minimal" })).artifact, "notification");
});

test("quiet, ready and unresolved-person states never emit", () => {
  assert.equal(rules.decideOccasionBackground(candidate({ quiet: true })).reason, "quiet");
  assert.equal(rules.decideOccasionBackground(candidate({ readiness: "ready" })).reason, "ready");
  assert.equal(rules.decideOccasionBackground(candidate({ personId: null })).reason, "selection_required");
});

test("occurrence/person/milestone identities remain independent", () => {
  const a = rules.occasionBackgroundDedupeKey(candidate());
  assert.notEqual(a, rules.occasionBackgroundDedupeKey(candidate({ occurrenceKey: "occasion:pl_boys_day:2027" })));
  assert.notEqual(a, rules.occasionBackgroundDedupeKey(candidate({ personId: "22222222-2222-4222-8222-222222222222" })));
  assert.notEqual(a, rules.occasionBackgroundDedupeKey(candidate({ phase: "preparing" })));
});

test("Edge path reuses one deterministic occasion rule and one writer boundary", () => {
  assert.match(edge, /decideOccasionBackground/);
  assert.match(edge, /resolvePlBoysDay/);
  assert.match(edge, /try_create_happy_proactive_occasion_artifact/);
  assert.doesNotMatch(edge, /openai|happyAgentProvider|occasion-proactive/);
  assert.match(migration, /security definer/i);
  assert.match(migration, /grant execute .*service_role/i);
  assert.match(migration, /revoke all .*authenticated/i);
});

test("quiet identity remains the accepted shared storage key", () => {
  assert.equal(policy.buildOccasionQuietKey({ occurrenceKey: "occasion:pl_boys_day:2026", personId: candidate().personId, checkpoint: "planning" }), "occasion:occasion:pl_boys_day:2026:11111111-1111-4111-8111-111111111111:planning");
});
