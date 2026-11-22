import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import "./server-test-loader.mjs";
import { assertStrictObjectSchemas, withOpenAiOutput } from "./helpers/openaiStructuredOutputHarness.mjs";

const { createOpenAiOccasionRescueProvider } = await import("../src/lib/occasions/occasionRescueProvider.server.ts");

const rescue = await import("../src/lib/occasions/occasionRescue.ts");
const { toRescueSignal, buildExistingHomeSignals } = await import("../src/lib/happy/signals/happySignalAdapters.ts");
const { selectPrimaryHappySignal } = await import("../src/lib/happy/signals/happySignalPriority.ts");

const base = { occurrenceKey: "occasion:pl_boys_day:2026", personId: "person-a", recipientResolution: "resolved", phase: "urgent", readiness: { kind: "needs_action", missing: ["gift", "greeting"] } };
const eligible = () => rescue.resolveOccasionRescueEligibility(base);

const resolved = { kind: "eligible", occasionKey: "pl_boys_day", occurrenceKey: base.occurrenceKey, person: { id: "11111111-1111-4111-8111-111111111111", name: "Synthetic Person", relationKey: null }, phase: "today", missing: ["gift", "greeting"] };
const suggestionOutput = { suggestions: [
  { category: "quick_gift", title: "A small item", description: "Consider a simple personal item", whyItFits: "A possible gesture" },
  { category: "digital", title: "Digital option", description: "Consider a digital gift", whyItFits: null },
  { category: "greeting", title: "A greeting", description: "Write a personal greeting", whyItFits: null },
] };
const callRescueProvider = async () => rescue.rescueResultSchema.parse(await createOpenAiOccasionRescueProvider("synthetic-key")({ ...resolved, locale: "en" }));

test("actual Rescue SDK schema requires every nested property including nullable whyItFits", async () => {
  const { value, requests } = await withOpenAiOutput(suggestionOutput, callRescueProvider);
  assert.equal(requests.length, 1);
  assertStrictObjectSchemas(requests[0].text.format.schema);
  assert.deepEqual(requests[0].text.format.schema.properties.suggestions.items.properties.whyItFits.type, ["string", "null"]);
  assert.equal(rescue.rescueResultSchema.safeParse(value).success, true);
});

test("Rescue boundary preserves explanations and removes only null optional explanations", async () => {
  const { value } = await withOpenAiOutput(suggestionOutput, callRescueProvider);
  assert.equal(value.suggestions[0].whyItFits, "A possible gesture");
  assert.equal(Object.hasOwn(value.suggestions[1], "whyItFits"), false);
  assert.equal(Object.hasOwn(value.suggestions[2], "whyItFits"), false);
});

test("Rescue provider output still rejects unknown categories, excessive lengths and write fields", async () => {
  for (const invalid of [
    { suggestions: [{ ...suggestionOutput.suggestions[0], category: "stock" }, ...suggestionOutput.suggestions.slice(1)] },
    { suggestions: [{ ...suggestionOutput.suggestions[0], title: "x".repeat(161) }, ...suggestionOutput.suggestions.slice(1)] },
    { ...suggestionOutput, action: { type: "send_message" } },
  ]) await assert.rejects(() => withOpenAiOutput(invalid, callRescueProvider));
});

test("Rescue eligibility is deterministic and narrow", () => {
  assert.equal(eligible().kind, "eligible");
  assert.equal(rescue.resolveOccasionRescueEligibility({ ...base, phase: "today" }).kind, "eligible");
  assert.equal(rescue.resolveOccasionRescueEligibility({ ...base, phase: "planning" }).kind, "ineligible");
  assert.equal(rescue.resolveOccasionRescueEligibility({ ...base, phase: "preparing" }).kind, "ineligible");
  assert.equal(rescue.resolveOccasionRescueEligibility({ ...base, readiness: { kind: "ready" } }).kind, "ineligible");
  assert.equal(rescue.resolveOccasionRescueEligibility({ ...base, recipientResolution: "selection_required", personId: null }).kind, "ineligible");
  assert.equal(rescue.resolveOccasionRescueEligibility({ ...base, recipientResolution: "none", personId: null }).kind, "ineligible");
});

test("Rescue identity is factual, stable, and separated by person and occurrence", () => {
  const current = eligible();
  assert.equal(current.kind, "eligible");
  assert.equal(current.rescueKey, "occasion:pl_boys_day:2026:person-a");
  assert.equal(rescue.occasionRescueKey("occasion:pl_boys_day:2026", "person-a"), current.rescueKey);
  assert.notEqual(rescue.occasionRescueKey("occasion:pl_boys_day:2026", "person-b"), current.rescueKey);
  assert.notEqual(rescue.occasionRescueKey("occasion:pl_boys_day:2027", "person-a"), current.rescueKey);
});

test("strict structured output permits only bounded, known advisory suggestions", () => {
  const valid = { suggestions: [
    { category: "quick_gift", title: "A", description: "B" },
    { category: "digital", title: "C", description: "D" },
    { category: "greeting", title: "E", description: "F", whyItFits: "G" },
  ] };
  assert.equal(rescue.rescueResultSchema.safeParse(valid).success, true);
  assert.equal(rescue.rescueResultSchema.safeParse({ suggestions: [{ category: "stock", title: "A", description: "B" }, ...valid.suggestions.slice(1) ] }).success, false);
  assert.equal(rescue.rescueResultSchema.safeParse({ suggestions: [...valid.suggestions, ...valid.suggestions] }).success, false);
  assert.equal(rescue.rescueResultSchema.safeParse({ ...valid, store: "X" }).success, false);
});

test("Rescue enters the existing selector with one stable actionable signal", () => {
  const fact = eligible();
  assert.equal(fact.kind, "eligible");
  const signal = toRescueSignal({ rescueKey: fact.rescueKey, occasionKey: "pl_boys_day", occurrenceKey: base.occurrenceKey, personId: "person-a", phase: "urgent", missing: fact.missing, daysUntil: 1 });
  assert.equal(signal?.signalKey, "happy-signal:rescue:occasion:pl_boys_day:2026:person-a");
  const existing = buildExistingHomeSignals({ actions: [], tasks: [], ideas: [], events: [], rescues: [signal], occasions: [], now: new Date("2026-09-29T12:00:00Z") });
  assert.equal(selectPrimaryHappySignal(existing)?.kind, "rescue");
});

test("Rescue source contracts keep Home deterministic and generation server-only", async () => {
  const [repository, route, resolver, provider, presentation] = await Promise.all([
    readFile(new URL("../src/lib/repositories/home/home.repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/happy/occasions/[occurrenceKey]/rescue/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/occasions/occasionRescue.server.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/occasions/occasionRescueProvider.server.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/happy/home/buildHomePrimaryHappyPresentation.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(repository, /openai|happyAgentProvider|responses\.create|provider/i);
  assert.match(route, /createOccasionRescueHandler/);
  assert.match(resolver, /resolveOccasionRescueEligibility/);
  assert.doesNotMatch(resolver, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  assert.match(provider, /Never claim current stock, inventory, price, merchant availability, delivery time, opening hours, bookings/);
  assert.match(presentation, /show_rescue/);
});
