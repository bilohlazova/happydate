import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { OCCASION_REGISTRY } from "../src/lib/occasions/occasionRegistry.ts";
import { isPersonRelevantForOccasion } from "../src/lib/occasions/occasionPeoplePolicy.ts";
import { resolveRelevantPeopleFromProjection } from "../src/lib/occasions/occasionPeopleResolver.ts";
import { parseOccasionOccurrenceKey } from "../src/lib/occasions/occasionResolver.ts";

const definition = OCCASION_REGISTRY[0];
const occurrenceKey = "occasion:pl_boys_day:2026";

const person = (id, name, gender, relationKey = "friend", userId = "user-a") => ({ id, name, gender, relationKey, userId });

test("registry documents the conservative explicit-gender recipient policy", () => {
  assert.equal(definition.key, "pl_boys_day");
  assert.deepEqual(definition.recipientRule.sufficientRelationships, []);
  assert.deepEqual(definition.recipientRule.allowedExplicitGenders, ["male"]);
});

test("only explicit male gender qualifies; labels and names are never consulted", () => {
  assert.deepEqual(isPersonRelevantForOccasion(definition, { relationKey: "friend", gender: "male" }), { relevant: true, reason: "explicit_gender" });
  assert.equal(isPersonRelevantForOccasion(definition, { relationKey: "friend", gender: "female" }).relevant, false);
  assert.equal(isPersonRelevantForOccasion(definition, { relationKey: "friend", gender: null }).relevant, false);
  assert.equal(isPersonRelevantForOccasion(definition, { relationKey: null, gender: "unspecified" }).relevant, false);
  assert.equal(isPersonRelevantForOccasion(definition, { relationKey: "other", gender: "other" }).relevant, false);
});

test("resolver returns none, one resolved person, or selection_required", () => {
  assert.equal(resolveRelevantPeopleFromProjection({ definition, occurrenceKey, people: [] }).kind, "none");
  assert.deepEqual(resolveRelevantPeopleFromProjection({ definition, occurrenceKey, people: [person("p1", "Mia", "male")] }), {
    kind: "resolved", occasionKey: "pl_boys_day", occurrenceKey, personId: "p1",
  });
  const result = resolveRelevantPeopleFromProjection({ definition, occurrenceKey, people: [person("p2", "Zed", "male"), person("p1", "Adam", "male")] });
  assert.equal(result.kind, "selection_required");
  assert.deepEqual(new Set(result.candidates?.map((candidate) => candidate.personId)), new Set(["p1", "p2"]));
});

test("non-matching gender and unknown gender are excluded without cross-user inference", () => {
  const result = resolveRelevantPeopleFromProjection({ definition, occurrenceKey, people: [
    person("a", "Female label", "female"),
    person("b", "Unknown", null),
    person("c", "Male", "male", "friend", "user-b"),
  ] });
  assert.equal(result.kind, "resolved");
  assert.equal(result.personId, "c");
});

test("occurrence identity is year-specific and strictly parsed", () => {
  assert.deepEqual(parseOccasionOccurrenceKey(occurrenceKey), { occasionKey: "pl_boys_day", year: 2026 });
  assert.deepEqual(parseOccasionOccurrenceKey("occasion:pl_boys_day:2027"), { occasionKey: "pl_boys_day", year: 2027 });
  assert.equal(parseOccasionOccurrenceKey("occasion:pl_boys_day:not-a-year"), null);
  assert.equal(parseOccasionOccurrenceKey("occasion:PL_Boys_Day:2026"), null);
});

test("repository and API use bounded owner-scoped reads and strict personId-only selection", async () => {
  const repository = await readFile(new URL("../src/lib/occasions/occasionPeople.repository.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../src/app/api/happy/occasions/[occurrenceKey]/person/route.ts", import.meta.url), "utf8");
  assert.match(repository, /select\(OCCASION_PEOPLE_SELECT\)/);
  assert.match(repository, /eq\("user_id", userId\)/);
  assert.doesNotMatch(repository, /select\("\*"\)/);
  assert.match(route, /z\.object\(\{ personId: UUID \}\)\.strict\(\)/);
  assert.match(route, /createTrustedOccasionClient/);
  assert.doesNotMatch(route, /bodySchema[\s\S]{0,200}(eventId|taskId|templateVersion)/);
});

test("selection table is owner-protected, trusted-write-only, and has DB owner validation", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20261012184303_create_happy_occasion_targets.sql", import.meta.url), "utf8");
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /grant select on table public\.happy_occasion_targets to authenticated/i);
  assert.match(sql, /grant select, insert, update on table public\.happy_occasion_targets to service_role/i);
  assert.match(sql, /revoke all on table public\.happy_occasion_targets from public, anon, authenticated/i);
  assert.match(sql, /validate_happy_occasion_target_references/);
  assert.match(sql, /p\.user_id = new\.user_id/);
  assert.match(sql, /primary key \(user_id, occurrence_key\)/i);
});

test("people matching path has no AI/provider or factual-domain writes", async () => {
  const source = await readFile(new URL("../src/lib/occasions/occasionPeople.repository.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../src/app/api/happy/occasions/[occurrenceKey]/person/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(`${source}\n${route}`, /openai|happyAgentProvider|from\("happy_(tasks|events|gifts|actions|memories|knowledge)"\)/i);
  assert.doesNotMatch(`${source}\n${route}`, /\.from\("happy_(tasks|task_steps|ideas|actions|notifications)"\)/i);
});
