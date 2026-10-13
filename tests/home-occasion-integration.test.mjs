import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const { getOccasionDefinitionsForCountry } = await import("../src/lib/occasions/occasionRegistry.ts");
const { resolveOccasionOccurrence } = await import("../src/lib/occasions/occasionResolver.ts");
const { resolveRelevantPeopleFromProjection } = await import("../src/lib/occasions/occasionPeopleResolver.ts");
const { toOccasionSignal } = await import("../src/lib/happy/signals/happySignalAdapters.ts");
const { selectPrimaryHappyBlock } = await import("../src/lib/happy/home/selectPrimaryHappyBlock.ts");
const { buildHomePrimaryHappyPresentation } = await import("../src/lib/happy/home/buildHomePrimaryHappyPresentation.ts");

const owner = "00000000-0000-4000-8000-000000000001";
const personA = "00000000-0000-4000-8000-000000000002";
const personB = "00000000-0000-4000-8000-000000000003";
const now = new Date("2026-09-23T12:00:00Z");

function occurrence(localDay) {
  const definition = getOccasionDefinitionsForCountry("PL")[0];
  return resolveOccasionOccurrence({ definition, year: 2026, localDay });
}

function resolution(occurrenceValue, people) {
  const definition = getOccasionDefinitionsForCountry("PL")[0];
  return resolveRelevantPeopleFromProjection({ definition, occurrenceKey: occurrenceValue.occurrenceKey, people });
}

function translate(key, values = {}) {
  const labels = {
    "countdown.today": "today",
    "countdown.tomorrow": "tomorrow",
    "countdown.days": `in ${values.count} days`,
    "primaryHappy.eyebrow": "Happy",
    "primaryHappy.idea.error": "Try again",
    "primaryHappy.occasion.pl_boys_day": "Boys' Day",
    "primaryHappy.occasion.title": `${values.occasion} for ${values.name}`,
    "primaryHappy.occasion.selectionTitle": `Who is ${values.occasion} for?`,
    "primaryHappy.occasion.planning": "You can start preparing.",
    "primaryHappy.occasion.preparing": "Choose the next step.",
    "primaryHappy.occasion.urgent": "Coming soon.",
    "primaryHappy.occasion.today": "Today.",
    "primaryHappy.occasion.selectionRequired": "Choose a person.",
  };
  return labels[key] ?? key;
}

const baseContext = (occasionSignals = [], overrides = {}) => ({
  userId: owner,
  now,
  actions: [],
  tasks: [],
  ideas: [],
  events: [],
  occasionSignals,
  ...overrides,
});

test("explicit country is required; timezone/locale alone cannot create a PL signal", () => {
  assert.deepEqual(getOccasionDefinitionsForCountry(null), []);
  assert.deepEqual(getOccasionDefinitionsForCountry(""), []);
  assert.equal(occurrence("2026-09-23")?.occurrenceKey, "occasion:pl_boys_day:2026");
});

test("real registry + trusted date + one relevant person builds a planning signal", () => {
  const current = occurrence("2026-09-23");
  const people = [{ id: personA, userId: owner, name: "Mia", relationKey: null, gender: "male" }];
  const signal = toOccasionSignal({ occurrence: current, people: resolution(current, people) });
  assert.equal(signal?.signalKey, "happy-signal:occasion:occasion:pl_boys_day:2026");
  assert.equal(signal?.phase, "planning");
  assert.equal(signal?.recipientResolution, "resolved");
  assert.equal(signal?.personId, personA);
});

test("none omits the signal and multiple relevant people remain selection_required", () => {
  const current = occurrence("2026-09-23");
  const definition = getOccasionDefinitionsForCountry("PL")[0];
  const none = resolveRelevantPeopleFromProjection({ definition, occurrenceKey: current.occurrenceKey, people: [] });
  assert.equal(toOccasionSignal({ occurrence: current, people: none }), null);
  const multiple = resolution(current, [
    { id: personA, userId: owner, name: "Mia", relationKey: null, gender: "male" },
    { id: personB, userId: owner, name: "Olek", relationKey: null, gender: "male" },
  ]);
  const signal = toOccasionSignal({ occurrence: current, people: multiple });
  assert.equal(signal?.recipientResolution, "selection_required");
  assert.equal(signal?.personId, null);
  assert.deepEqual(signal?.candidates.map((candidate) => candidate.personId), [personA, personB]);
});

test("active phases enter Home while outside phases are omitted", () => {
  const planning = occurrence("2026-09-23");
  const urgent = occurrence("2026-09-29");
  const outside = occurrence("2026-09-20");
  const people = [{ id: personA, userId: owner, name: "Mia", relationKey: null, gender: "male" }];
  assert.equal(toOccasionSignal({ occurrence: planning, people: resolution(planning, people) })?.phase, "planning");
  assert.equal(toOccasionSignal({ occurrence: urgent, people: resolution(urgent, people) })?.phase, "urgent");
  assert.equal(toOccasionSignal({ occurrence: outside, people: resolution(outside, people) }), null);
});

test("Occasion uses the same Block-47 selector and never bypasses stronger explicit work", () => {
  const current = occurrence("2026-09-23");
  const signal = toOccasionSignal({ occurrence: current, people: resolution(current, [{ id: personA, userId: owner, name: "Mia", relationKey: null, gender: "male" }]) });
  assert.equal(selectPrimaryHappyBlock(baseContext([signal]))?.type, "occasion");
  const idea = { id: "00000000-0000-4000-8000-000000000010", userId: owner, type: "start_gift_planning", title: "Prepare", message: "Prepare", status: "new", personId: null, eventId: null, createdAt: "2026-09-20T00:00:00Z" };
  assert.equal(selectPrimaryHappyBlock(baseContext([signal], { ideas: [idea] }))?.type, "occasion");
  const pending = { id: "00000000-0000-4000-8000-000000000011", userId: owner, type: "save_gift", status: "pending", createdAt: "2026-09-20T00:00:00Z" };
  assert.equal(selectPrimaryHappyBlock(baseContext([signal], { actions: [pending] }))?.type, "approval");
});

test("selected Occasion presentation is compact, high-attention, or actionable without a second ranking pass", () => {
  const people = [{ id: personA, userId: owner, name: "Mia", relationKey: null, gender: "male" }];
  for (const [day, expected] of [["2026-09-23", "compact"], ["2026-09-27", "compact"], ["2026-09-29", "high_attention"], ["2026-09-30", "high_attention"]]) {
    const current = occurrence(day);
    const signal = toOccasionSignal({ occurrence: current, people: resolution(current, people) });
    const block = selectPrimaryHappyBlock(baseContext([signal]));
    const presentation = buildHomePrimaryHappyPresentation(block, { people, events: [], memories: [], giftHistory: [], isAuthenticated: true, userId: owner, profile: null, authMetadataName: null, email: null, pendingGiftOutcomes: [], knowledgeReviewPreferences: { homeEnabled: true, voiceEnabled: true }, errors: [] }, now, translate);
    assert.equal(presentation?.visualTreatment, expected);
    assert.equal(presentation?.kind, "occasion");
  }
  const current = occurrence("2026-09-23");
  const selection = toOccasionSignal({ occurrence: current, people: resolution(current, people.concat({ id: personB, userId: owner, name: "Olek", relationKey: null, gender: "male" })) });
  const presentation = buildHomePrimaryHappyPresentation(selectPrimaryHappyBlock(baseContext([selection])), { people, events: [], memories: [], giftHistory: [], isAuthenticated: true, userId: owner, profile: null, authMetadataName: null, email: null, pendingGiftOutcomes: [], knowledgeReviewPreferences: { homeEnabled: true, voiceEnabled: true }, errors: [] }, now, translate);
  assert.equal(presentation?.visualTreatment, "selection");
  assert.deepEqual(presentation?.occasionCandidates.map((candidate) => candidate.personId), [personA, personB]);
});

test("Home read integration is read-only, bounded, owner-scoped, and sends only personId for selection", async () => {
  const repository = await readFile(new URL("../src/lib/repositories/home/home.repository.ts", import.meta.url), "utf8");
  const client = await readFile(new URL("../src/components/HomePageClient.tsx", import.meta.url), "utf8");
  assert.match(repository, /getUserOccasionsForLocalDay/);
  assert.match(repository, /getSelectedOccasionPerson/);
  assert.match(repository, /resolveRelevantPeopleFromProjection/);
  assert.match(repository, /\.limit\(100\)/);
  assert.doesNotMatch(repository, /happy_occasion_targets.*\.(insert|update|upsert|delete)/s);
  assert.match(client, /JSON\.stringify\(\{ personId \}\)/);
  assert.doesNotMatch(client, /body:\s*JSON\.stringify\(\{[^}]*\b(?:userId|country|gender|relation)\b/i);
});

test("wellbeing stays outside HappySignal and Home keeps one Happy insertion", async () => {
  const signalTypes = await readFile(new URL("../src/lib/happy/signals/happySignal.types.ts", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../src/components/home-dashboard/HomeDashboard.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(signalTypes, /WellbeingSignal|wellbeing/);
  assert.equal((dashboard.match(/<WellbeingCheckIn/g) ?? []).length, 1);
  assert.equal((dashboard.match(/<HomePrimaryHappyBlock/g) ?? []).length, 1);
  assert.ok(dashboard.indexOf("<WellbeingCheckIn") < dashboard.indexOf("<HomePrimaryHappyBlock"));
});
