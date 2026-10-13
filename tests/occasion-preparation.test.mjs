import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { deriveOccasionGiftFacts, resolveOccasionPreparationReadiness } from "../src/lib/occasions/occasionPreparation.ts";
import { buildHomePrimaryHappyPresentation } from "../src/lib/happy/home/buildHomePrimaryHappyPresentation.ts";

const t = (key) => ({
  "primaryHappy.eyebrow": "Happy",
  "primaryHappy.occasion.pl_boys_day": "Boys' Day",
  "primaryHappy.occasion.title": ({ occasion, name }) => `${occasion} for ${name}`,
  "primaryHappy.occasion.planning": "You can start preparing.",
  "primaryHappy.occasion.preparing": "Choose the next step.",
  "primaryHappy.occasion.urgent": "Coming soon.",
  "primaryHappy.occasion.today": "Today.",
  "primaryHappy.occasion.selectionRequired": "Choose a person.",
  "primaryHappy.occasion.ready": "Everything is under control.",
}[key] ?? key);

const base = { userId: "u", now: new Date("2026-09-23T00:00:00Z"), people: [{ id: "p", name: "Mia" }], memories: [], events: [] };
const signal = (readiness) => ({ kind: "occasion", occasionKey: "pl_boys_day", occurrenceKey: "occasion:pl_boys_day:2026", phase: "planning", recipientResolution: "resolved", personId: "p", candidates: [], daysUntil: 7, readiness });

test("canonical lifecycle facts are deterministic and only selected+ satisfy gift", () => {
  assert.equal(deriveOccasionGiftFacts({ lifecycle: null }).satisfiesGiftRequirement, false);
  assert.equal(deriveOccasionGiftFacts({ lifecycle: "idea" }).satisfiesGiftRequirement, false);
  for (const lifecycle of ["selected", "purchased", "given"]) assert.equal(deriveOccasionGiftFacts({ lifecycle }).satisfiesGiftRequirement, true);
});

test("readiness requires gift, greeting, and explicit preparation without percentages", () => {
  const missing = resolveOccasionPreparationReadiness({ gift: deriveOccasionGiftFacts({ lifecycle: null }), greeting: { status: "missing" }, preparation: { status: "not_started" } });
  assert.deepEqual(missing, { kind: "needs_action", missing: ["gift", "greeting", "preparation"] });
  const partial = resolveOccasionPreparationReadiness({ gift: deriveOccasionGiftFacts({ lifecycle: "selected" }), greeting: { status: "prepared" }, preparation: { status: "in_progress" } });
  assert.deepEqual(partial, { kind: "in_progress", missing: ["preparation"] });
  const ready = resolveOccasionPreparationReadiness({ gift: deriveOccasionGiftFacts({ lifecycle: "given" }), greeting: { status: "prepared" }, preparation: { status: "completed" } });
  assert.deepEqual(ready, { kind: "ready" });
  assert.equal("percentage" in ready, false);
});

test("ready Occasion keeps its phase and becomes calm presentation without CTA", () => {
  const presentation = buildHomePrimaryHappyPresentation({ type: "occasion", signal: signal({ kind: "ready" }), block: { type: "occasion", occasionKey: "pl_boys_day", occurrenceKey: "occasion:pl_boys_day:2026", phase: "planning", recipientResolution: "resolved", personId: "p", candidates: [], readiness: { kind: "ready" } } }, base, base.now, t);
  assert.equal(presentation?.visualTreatment, "compact");
  assert.equal(presentation?.statusText, "Everything is under control.");
  assert.equal(presentation?.primaryAction, null);
});

test("urgent ready Occasion remains one high-attention story and never becomes rescue", () => {
  const s = signal({ kind: "ready" });
  s.phase = "today";
  const presentation = buildHomePrimaryHappyPresentation({ type: "occasion", signal: s, block: { type: "occasion", occasionKey: "pl_boys_day", occurrenceKey: "occasion:pl_boys_day:2026", phase: "today", recipientResolution: "resolved", personId: "p", candidates: [], readiness: { kind: "ready" } } }, base, base.now, t);
  assert.equal(presentation?.visualTreatment, "high_attention");
  assert.equal(presentation?.primaryAction, null);
});

test("persistence is one owner/occurrence/person fact row and browser cannot write readiness", async () => {
  const migration = await readFile("supabase/migrations/20261013183935_create_happy_occasion_preparations.sql", "utf8");
  assert.match(migration, /unique \(user_id, occurrence_key, person_id\)/);
  assert.match(migration, /status in \('not_started','in_progress','completed'\)/);
  assert.match(migration, /greeting_content/);
  assert.match(migration, /grant select, insert, update on table public\.happy_occasion_preparations to service_role/);
  assert.match(migration, /grant select on table public\.happy_occasion_preparations to authenticated/);
  assert.doesNotMatch(migration.replace(/--.*$/gm, ""), /readiness|percentage|score/i);
});
