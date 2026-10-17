import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const domain = await import("../supabase/functions/happy-proactive/occasion-domain.ts");
const resolver = await import("../src/lib/occasions/occasionResolver.ts");
const registry = await import("../src/lib/occasions/occasionRegistry.ts");
const migration = await readFile(new URL("../supabase/migrations/20261015171412_add_happy_occasion_outcomes_and_timing_preferences.sql", import.meta.url), "utf8");
const edge = await readFile(new URL("../supabase/functions/happy-proactive/index.ts", import.meta.url), "utf8");
const outcomeRoute = await readFile(new URL("../src/app/api/happy/occasions/[occurrenceKey]/outcome/route.ts", import.meta.url), "utf8");
const timingRoute = await readFile(new URL("../src/app/api/happy/occasions/[occurrenceKey]/lead-time/route.ts", import.meta.url), "utf8");
const outcomeServer = await readFile(new URL("../src/lib/occasions/occasionOutcome.server.ts", import.meta.url), "utf8");

test("post-event is exactly D+1, requires a resolved person, and stops after an outcome", () => {
  const base = { occasionDate: "2026-09-30", personId: "p1", existingOutcome: false };
  assert.equal(domain.resolvePostEventEligibility({ ...base, localDay: "2026-09-30" }), false);
  assert.equal(domain.resolvePostEventEligibility({ ...base, localDay: "2026-10-01" }), true);
  assert.equal(domain.resolvePostEventEligibility({ ...base, localDay: "2026-10-02" }), false);
  assert.equal(domain.resolvePostEventEligibility({ ...base, localDay: "2026-10-01", personId: null }), false);
  assert.equal(domain.resolvePostEventEligibility({ ...base, localDay: "2026-10-01", existingOutcome: true }), false);
});

test("lead-time presets only advance after explicit consent and leave one planning milestone", () => {
  assert.equal(domain.normalizeOccasionLeadTime(undefined), 7);
  assert.equal(domain.getEarlierLeadTimeProposal(7), 14);
  assert.equal(domain.getEarlierLeadTimeProposal(14), 21);
  assert.equal(domain.getEarlierLeadTimeProposal(21), 30);
  assert.equal(domain.getEarlierLeadTimeProposal(30), null);
  assert.equal(domain.resolveOccasionPhase(15, 14), null);
  assert.equal(domain.resolveOccasionPhase(14, 14), "planning");
  assert.equal(domain.resolveOccasionPhase(8, 14), "planning");
  assert.equal(domain.resolveOccasionPhase(7, 14), "planning");
  assert.equal(domain.resolveOccasionPhase(3, 14), "preparing");
  const boysDay = registry.OCCASION_REGISTRY[0];
  assert.equal(resolver.resolveOccasionOccurrence({ definition: boysDay, year: 2027, localDay: "2027-09-16", leadTimeDays: 14 })?.phase, "planning");
  assert.equal(resolver.resolveOccasionOccurrence({ definition: boysDay, year: 2027, localDay: "2027-09-16" })?.phase, null);
});

test("narrow tables enforce occurrence facts and per-occasion timing without behavioural profiles", () => {
  assert.match(migration, /create table public\.happy_occasion_outcomes/i);
  assert.match(migration, /outcome in \('went_well', 'needed_more_time', 'did_not_happen'\)/);
  assert.match(migration, /unique \(user_id, occurrence_key, person_id\)/);
  assert.match(migration, /create table public\.happy_occasion_timing_preferences/i);
  assert.match(migration, /lead_time_days in \(7, 14, 21, 30\)/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /grant select, insert, update on table public\.happy_occasion_outcomes to service_role/);
  assert.doesNotMatch(migration, /create table public\.(?:knowledge|memories|happy_actions|behavior_profiles|engagement_events)/i);
  assert.doesNotMatch(migration, /grant .*happy_occasion_outcomes to authenticated.*insert/i);
});

test("post-event reuses the existing Edge pipeline and occurrence-scoped semantic dedupe", () => {
  assert.match(edge, /resolvePostEventEligibility/);
  assert.match(edge, /p_milestone: "post_event"/);
  assert.match(migration, /occasion_post_event/);
  assert.match(migration, /post_event/);
  assert.doesNotMatch(edge, /openai|happyAgentProvider|occasion-proactive/i);
});

test("outcome and timing routes accept only canonical user choices and derive all authority server-side", () => {
  assert.match(outcomeRoute, /z\.object\(\{ outcome: z\.enum\(OCCASION_OUTCOMES\) \}\)\.strict\(\)/);
  assert.match(outcomeRoute, /resolveOwnedPostEventOccurrence/);
  assert.doesNotMatch(outcomeRoute, /personId.*request\.json|userId.*request\.json|leadTime/);
  assert.match(timingRoute, /z\.object\(\{ leadTimeDays:/);
  assert.match(timingRoute, /getOccasionCountry/);
  assert.doesNotMatch(timingRoute, /personId|occurrenceKey.*body|userId.*request\.json/);
  assert.match(outcomeServer, /onConflict: "user_id,occurrence_key,person_id"/);
  assert.doesNotMatch(outcomeServer, /happy_actions|knowledge|memory/i);
});
