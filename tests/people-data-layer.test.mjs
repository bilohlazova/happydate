import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildPeoplePageViewModel,
  buildPersonProfileViewModel,
} from "../src/lib/people/buildPeopleViewModels.ts";

function person(overrides = {}) {
  return {
    id: "person-1", user_id: "user-1", name: "Anna", relationship: "Żona",
    relation_label: "Żona", relation_key: "spouse", relation_category: "partner",
    birthday: "1990-07-24", notes: null, phone: null, email: null,
    external_contact_id: null, contact_source: "manual", gender: "female",
    created_at: "2026-01-01T00:00:00.000Z", ...overrides,
  };
}

function knowledge(overrides = {}) {
  return {
    id: "knowledge-1", personId: "person-1", eventId: null, kind: "preference",
    category: "interest", polarity: "likes", title: null, value: "Podróże",
    occurredOn: null, importance: 0, tags: [], summary: null, state: "active",
    aiEligible: true, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: null,
    legacyType: "interest", evidence: { sourceKind: "manual", sourceId: "knowledge-1", originalText: "Podróże", capturedAt: "2026-07-01T00:00:00.000Z" },
    classification: null, compatibility: { valueText: "Podróże", contentText: null },
    ...overrides,
  };
}

test("PeoplePageViewModel is deterministic and excludes private or unrelated knowledge", () => {
  const model = buildPeoplePageViewModel({
    people: [person(), person({ id: "person-2", name: "Beta", birthday: null })],
    knowledge: [
      knowledge(),
      knowledge({ id: "journal", kind: "journal", value: "PRIVATE", legacyType: "journal" }),
      knowledge({ id: "archived", state: "archived", value: "ARCHIVED" }),
      knowledge({ id: "other", personId: "other-user-person", value: "OTHER USER" }),
    ],
    currentDate: new Date(2026, 6, 18),
  });
  assert.equal(model.summary.peopleCount, 2);
  assert.equal(model.summary.birthdaysThisWeek, 1);
  assert.equal(model.people[0].knowledgeItemCount, 1);
  assert.equal(model.people[0].memoriesCount, 0);
  assert.equal(model.people[0].searchText.includes("PRIVATE"), false);
  assert.equal(model.people[0].searchText.includes("OTHER USER"), false);
  assert.equal(model.recommendation?.personId, "person-1");
});

test("profile projection separates likes, dislikes, interests and important facts", () => {
  const model = buildPersonProfileViewModel({
    person: person(),
    knowledge: [
      knowledge({ id: "like", value: "Kawa", category: "coffee", polarity: "likes" }),
      knowledge({ id: "dislike", value: "Ostre potrawy", category: "food", polarity: "dislikes" }),
      knowledge({ id: "hobby", value: "Fotografia", category: "hobby", polarity: "neutral", legacyType: "hobby" }),
      knowledge({ id: "fact", kind: "fact", value: "Ma kota", category: "family", polarity: null, legacyType: "family" }),
    ],
    currentDate: new Date(2026, 6, 18),
  });
  assert.deepEqual(model.likes.map((item) => item.value), ["Kawa"]);
  assert.deepEqual(model.dislikes.map((item) => item.value), ["Ostre potrawy"]);
  assert.deepEqual(model.interests.map((item) => item.value), ["Fotografia"]);
  assert.deepEqual(model.importantFacts.map((item) => item.value), ["Ma kota"]);
});

test("only an explicitly confirmed given gift enters history and timeline", () => {
  const confirmed = { confidence: 1, classifierVersion: null, classifiedAt: null, userConfirmed: true };
  const model = buildPersonProfileViewModel({
    person: person(),
    knowledge: [
      knowledge({ id: "idea", kind: "gift", category: "idea", value: "Kindle", polarity: null, legacyType: "gift" }),
      knowledge({ id: "purchased", kind: "gift", category: "purchased", value: "Kawa", polarity: null, legacyType: "gift" }),
      knowledge({ id: "unconfirmed", kind: "gift", category: "given", value: "Niepewny", polarity: null, legacyType: "gift" }),
      knowledge({ id: "given", kind: "gift", category: "given", value: "Kwiaty", polarity: null, occurredOn: "2025-05-01", classification: confirmed, legacyType: "gift" }),
      knowledge({ id: "memory", kind: "experience", category: null, value: "Zakopane", polarity: null, occurredOn: "2025-06-01", legacyType: "memory" }),
    ],
  });
  assert.deepEqual(model.giftIdeas.map((item) => item.value), ["Kindle", "Kawa"]);
  assert.deepEqual(model.giftHistory.map((item) => item.value), ["Kwiaty"]);
  assert.deepEqual(model.timeline.map((item) => [item.kind, item.title]), [
    ["memory", "Zakopane"], ["gift_given", "Kwiaty"],
  ]);
  assert.equal(JSON.stringify(model).includes("Niepewny"), false);
});

test("Person Health uses the six approved areas and never sizes", () => {
  const model = buildPersonProfileViewModel({ person: person({ birthday: null }), knowledge: [] });
  assert.deepEqual(model.health?.missingAreas.map((item) => item.id), [
    "birthday", "preferences", "interests", "giftIdea", "importantFacts", "memories",
  ]);
  assert.equal(JSON.stringify(model.health).toLowerCase().includes("size"), false);
  assert.equal(model.health?.level, "starting");
});

test("AI-ineligible knowledge cannot influence Person Brain insights", () => {
  const model = buildPersonProfileViewModel({
    person: person(),
    knowledge: [knowledge({ id: "private-gift", kind: "gift", category: "idea", value: "SECRET", legacyType: "gift", aiEligible: false })],
    currentDate: new Date(2026, 6, 18),
  });
  assert.equal(JSON.stringify(model.brainInsights).includes("SECRET"), false);
});

test("Stage 6.1 dependency and ownership guards protect production loaders", async () => {
  const loaders = await readFile(new URL("../src/lib/people/people.loaders.ts", import.meta.url), "utf8");
  const builders = await readFile(new URL("../src/lib/people/buildPeopleViewModels.ts", import.meta.url), "utf8");
  const repository = await readFile(new URL("../src/lib/repositories/personRepository.ts", import.meta.url), "utf8");
  const listPage = await readFile(new URL("../src/app/people/page.tsx", import.meta.url), "utf8");
  const profilePage = await readFile(new URL("../src/app/people/[id]/page.tsx", import.meta.url), "utf8");
  for (const forbidden of ['.from("memories")', "MemoryRow", "getActiveMemories", "getMemoriesForPerson", "getBrainMemories", "value_text", "content_text"]) {
    assert.equal(loaders.includes(forbidden), false, forbidden);
    assert.equal(builders.includes(forbidden), false, forbidden);
  }
  assert.equal((loaders.match(/auth\.getUser\(\)/g) ?? []).length, 1);
  assert.equal((loaders.match(/listKnowledge\(/g) ?? []).length, 1);
  assert.equal((loaders.match(/getKnowledgeForPerson\(/g) ?? []).length, 1);
  assert.ok(loaders.lastIndexOf("getOwnedPersonById(") < loaders.lastIndexOf("getKnowledgeForPerson("));
  assert.match(repository, /\.eq\("id", personId\)[\s\S]*\.eq\("user_id", userId\)/);
  assert.equal(listPage.includes("people.loaders"), true);
  assert.equal(profilePage.includes("people.loaders"), true);
});

test("Stage 6.3 profile consumes PersonProfileViewModel without legacy reads", async () => {
  const page = await readFile(new URL("../src/app/people/[id]/page.tsx", import.meta.url), "utf8");
  const content = await readFile(new URL("../src/components/people/PersonProfileContent.tsx", import.meta.url), "utf8");

  assert.equal((page.match(/loadPersonProfile\(/g) ?? []).length, 1);
  assert.match(page, /PersonProfileViewModel/);
  assert.match(content, /viewModel: PersonProfileViewModel \| null/);

  for (const forbidden of [
    "supabase",
    "MemoryRow",
    "getMemoriesForPerson",
    "getPersonById",
    "memoryRepository",
    "buildPersonKnowledge",
    "mapMemory",
  ]) {
    assert.equal(page.includes(forbidden), false, forbidden);
    assert.equal(content.includes(forbidden), false, forbidden);
  }
});

test("Stage 6.2 People list consumes one ViewModel and has no legacy read path", async () => {
  const page = await readFile(new URL("../src/app/people/page.tsx", import.meta.url), "utf8");
  const content = await readFile(new URL("../src/components/people/PeoplePageContent.tsx", import.meta.url), "utf8");

  assert.equal((page.match(/loadPeoplePage\(/g) ?? []).length, 2);
  assert.match(page, /viewModel=\{viewModel\}/);
  assert.match(content, /viewModel: PeoplePageViewModel \| null/);

  for (const forbidden of [
    "getActiveMemories",
    "MemoryRow",
    "loadBrain",
    "createHappyContext",
    "getPeople(",
    '.from("memories")',
  ]) {
    assert.equal(page.includes(forbidden), false, forbidden);
    assert.equal(content.includes(forbidden), false, forbidden);
  }
});
