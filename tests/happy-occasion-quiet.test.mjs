import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const policy = await import("../supabase/functions/happy-proactive/proactivity-policy.ts");
const route = await readFile(new URL("../src/app/api/happy/occasions/[occurrenceKey]/[disposition]/route.ts", import.meta.url), "utf8");
const home = await readFile(new URL("../src/lib/repositories/home/home.repository.ts", import.meta.url), "utf8");

test("Occasion checkpoints are semantic and progress only at supported milestones", () => {
  assert.deepEqual(policy.OCCASION_CHECKPOINTS, ["planning", "preparing", "urgent", "today"]);
  assert.equal(policy.occasionCheckpointForPhase("planning"), "planning");
  assert.equal(policy.occasionCheckpointForPhase("preparing"), "preparing");
  assert.equal(policy.occasionCheckpointForPhase("urgent"), "urgent");
  assert.equal(policy.occasionCheckpointForPhase("today"), "today");
  assert.equal(policy.nextOccasionCheckpoint("planning"), "preparing");
  assert.equal(policy.nextOccasionCheckpoint("preparing"), "urgent");
  assert.equal(policy.nextOccasionCheckpoint("urgent"), "today");
  assert.equal(policy.nextOccasionCheckpoint("today"), null);
});

test("Occasion quiet keys isolate occurrence, person/selection, and checkpoint", () => {
  const base = policy.buildOccasionQuietKey({ occurrenceKey: "occasion:pl_boys_day:2026", personId: "p1", checkpoint: "planning" });
  assert.equal(base, "occasion:occasion:pl_boys_day:2026:p1:planning");
  assert.notEqual(base, policy.buildOccasionQuietKey({ occurrenceKey: "occasion:pl_boys_day:2026", personId: "p1", checkpoint: "preparing" }));
  assert.notEqual(base, policy.buildOccasionQuietKey({ occurrenceKey: "occasion:pl_boys_day:2027", personId: "p1", checkpoint: "planning" }));
  assert.notEqual(base, policy.buildOccasionQuietKey({ occurrenceKey: "occasion:pl_boys_day:2026", personId: "p2", checkpoint: "planning" }));
  assert.equal(policy.buildOccasionQuietKey({ occurrenceKey: "occasion:pl_boys_day:2026", personId: null, checkpoint: "planning" }), "occasion:occasion:pl_boys_day:2026:recipient-selection:planning");
});

test("server derives Occasion quiet identity and Home filters it before presentation", () => {
  assert.match(route, /quietCurrentOccasion/);
  assert.doesNotMatch(route, /request\.json/);
  assert.match(route, /request\.text\(\)/);
  assert.match(home, /happy_proactive_quiet/);
  assert.match(home, /buildOccasionQuietKey/);
});

test("quiet semantics remain one trusted store and no action telemetry", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20261015120000_allow_owner_reads_of_proactive_quiet.sql", import.meta.url), "utf8");
  const quiet = await readFile(new URL("../src/lib/happy/proactive/quiet.server.ts", import.meta.url), "utf8");
  assert.match(migration, /grant select on table public\.happy_proactive_quiet to authenticated/i);
  assert.match(migration, /happy_proactive_quiet_select_own/);
  assert.match(quiet, /quietHappySemanticKey/);
  assert.doesNotMatch(quiet, /happy_actions/);
});
