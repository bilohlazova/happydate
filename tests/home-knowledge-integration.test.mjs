import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildAssistantMemoryContext } from "../src/lib/assistant/memoryContext.ts";
import { buildHomeViewModel } from "../src/lib/home/buildHomeViewModel.ts";
import { mapLegacyMemoriesToKnowledge } from "../src/lib/knowledge/compatibilityMapper.ts";
import { projectKnowledgeForHome } from "../src/lib/knowledge/homeKnowledgeProjection.ts";

function row(id, type, value, overrides = {}) {
  return {
    id, user_id: "user-1", person_id: "person-1", event_id: null,
    content_text: null, audio_url: null, transcript_text: null, images: null,
    ai_summary: null, ai_tags: null, ai_emotional_score: null,
    created_at: "2026-07-01T00:00:00.000Z", updated_at: null,
    type, title: null, value_text: value, occurred_on: null,
    importance: 0, source: "manual", is_active: true, ...overrides,
  };
}

const t = (key, values = {}) => `${key}:${Object.values(values).join("|")}`;
function home(memories = [], overrides = {}) {
  return {
    isAuthenticated: true, profile: null, authMetadataName: null, email: null,
    people: [{ id: "person-1", name: "Anna", birthday: "1990-07-20", relationLabel: "Mama", gender: null }],
    events: [], memories, errors: [], ...overrides,
  };
}

test("legacy rows map to the same Home gift, preference, memory and note semantics", () => {
  const projected = projectKnowledgeForHome(mapLegacyMemoriesToKnowledge([
    row("gift", "gift", "Book"),
    row("preference", "coffee", "Flat White"),
    row("memory", "memory", null, { title: "Italy" }),
    row("note", "custom", null, { content_text: "Call later" }),
  ]));
  assert.deepEqual(projected.map(({ id, category, value }) => ({ id, category, value })), [
    { id: "gift", category: "gift", value: "Book" },
    { id: "preference", category: "preference", value: "Flat White" },
    { id: "memory", category: "memory", value: "Italy" },
    { id: "note", category: "note", value: "Call later" },
  ]);
});

test("legacy Home projection and canonical Knowledge projection render identically", () => {
  const rows = [
    row("gift", "gift", "Book"),
    row("preference", "coffee", "Latte"),
    row("memory", "story", null, { title: "Italy" }),
  ];
  const canonical = projectKnowledgeForHome(mapLegacyMemoriesToKnowledge(rows));
  const legacyReference = [
    { id: "gift", personId: "person-1", eventId: null, category: "gift", title: null, value: "Book", occurredOn: null, createdAt: rows[0].created_at, isActive: true },
    { id: "preference", personId: "person-1", eventId: null, category: "preference", title: null, value: "Latte", occurredOn: null, createdAt: rows[1].created_at, isActive: true },
    { id: "memory", personId: "person-1", eventId: null, category: "memory", title: "Italy", value: "Italy", occurredOn: null, createdAt: rows[2].created_at, isActive: true },
  ];
  assert.deepEqual(
    buildHomeViewModel(home(canonical), "pl", t, new Date(2026, 6, 17)),
    buildHomeViewModel(home(legacyReference), "pl", t, new Date(2026, 6, 17)),
  );
});

test("empty Home and a single or urgent event preserve presentation behavior", () => {
  const empty = buildHomeViewModel(home([], { people: [], events: [] }), "pl", t, new Date(2026, 6, 17));
  assert.equal(empty.isEmpty, true);
  const one = buildHomeViewModel(home([], {
    people: [], events: [{ id: "urgent", title: "Today", date: "2026-07-17", category: "personal", notes: null, personId: null }],
  }), "pl", t, new Date(2026, 6, 17));
  assert.equal(one.featuredEvent?.id, "urgent");
  assert.equal(one.featuredEvent?.daysUntil, 0);
});

test("stored birthday and person birthday render as one event for the same occurrence", () => {
  const model = buildHomeViewModel(home([], {
    people: [{ id: "dima", name: "Діма", birthday: "1990-08-03", relationLabel: "Брат", gender: "male" }],
    events: [{
      id: "stored-birthday",
      title: "Birthday: Діма",
      date: "2026-08-03",
      category: "birthday",
      notes: null,
      personId: "dima",
    }],
  }), "uk", t, new Date(2026, 7, 3));

  assert.deepEqual(model.upcomingEvents.map((event) => event.id), ["birthday-dima"]);
});

test("legacy unlinked birthday is deduplicated by person name and date", () => {
  const model = buildHomeViewModel(home([], {
    people: [{ id: "dima", name: "Діма", birthday: "1990-08-03", relationLabel: null, gender: null }],
    events: [{
      id: "legacy-birthday",
      title: "Birthday: Діма",
      date: "2026-08-03",
      category: "birthday",
      notes: null,
      personId: null,
    }],
  }), "uk", t, new Date(2026, 7, 3));

  assert.deepEqual(model.upcomingEvents.map((event) => event.id), ["birthday-dima"]);
});

test("different people with birthdays on the same date remain separate", () => {
  const model = buildHomeViewModel(home([], {
    people: [
      { id: "dima", name: "Діма", birthday: "1990-08-03", relationLabel: null, gender: null },
      { id: "denys", name: "Денис", birthday: "1991-08-03", relationLabel: null, gender: null },
    ],
    events: [{
      id: "dima-stored",
      title: "Birthday: Діма",
      date: "2026-08-03",
      category: "birthday",
      notes: null,
      personId: "dima",
    }],
  }), "uk", t, new Date(2026, 7, 3));

  assert.deepEqual(
    model.upcomingEvents.map((event) => event.id).sort(),
    ["birthday-denys", "birthday-dima"],
  );
});

test("multiple people, equal dates and event ordering stay deterministic", () => {
  const model = buildHomeViewModel(home([], {
    people: [
      { id: "b", name: "Beta", birthday: "1990-07-20", relationLabel: null, gender: null },
      { id: "a", name: "Alpha", birthday: "1990-07-20", relationLabel: null, gender: null },
    ],
  }), "pl", t, new Date(2026, 6, 17));
  assert.deepEqual(model.upcomingEvents.map((event) => event.title), [
    "events.birthdayTitle:Alpha", "events.birthdayTitle:Beta",
  ]);
});

test("preference deduplication and missing-context recommendation remain unchanged", () => {
  const knowledge = projectKnowledgeForHome(mapLegacyMemoriesToKnowledge([
    row("a", "coffee", "Latte"), row("b", "coffee", "Latte"),
  ]));
  const withPreference = buildHomeViewModel(home(knowledge), "pl", t, new Date(2026, 6, 17));
  assert.deepEqual(withPreference.featuredEvent?.preferences, ["Latte"]);
  assert.equal(withPreference.recommendations.some((item) => item.id.startsWith("context-")), false);
  const missing = buildHomeViewModel(home([]), "pl", t, new Date(2026, 6, 17));
  assert.equal(missing.recommendations.some((item) => item.id.startsWith("context-")), true);
});

test("archived, journal and AI-ineligible knowledge are excluded from Home projection", () => {
  const items = mapLegacyMemoriesToKnowledge([
    row("archived", "gift", "Hidden", { is_active: false }),
    row("journal", "journal", "PRIVATE"),
    row("private", "coffee", "Secret"),
  ]);
  items[2].aiEligible = false;
  const projected = projectKnowledgeForHome(items);
  assert.deepEqual(projected, []);
});

test("AI-ineligible knowledge is excluded from Home Assistant Context", () => {
  const [privateItem] = mapLegacyMemoriesToKnowledge([row("private", "coffee", "Secret")]);
  privateItem.aiEligible = false;
  const context = buildAssistantMemoryContext(
    [{ id: "person-1", name: "Anna", relation: null, birthday: null, gender: null }],
    [privateItem],
  );
  assert.deepEqual(context, []);
});

test("Home production dependency guard rejects legacy Memory access and interpretation", async () => {
  const paths = [
    "../src/lib/repositories/home/home.repository.ts",
    "../src/lib/home/loadHome.ts",
    "../src/lib/home/buildHomeViewModel.ts",
    "../src/lib/home/home.types.ts",
    "../src/components/HomePageClient.tsx",
    "../src/hooks/useAssistantHomeContext.ts",
  ];
  const sources = await Promise.all(paths.map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  for (const source of sources) {
    for (const forbidden of [
      '.from("memories")', "MemoryRow", "BrainMemory", "getBrainMemories",
      "normalizeStoredMemoryType", "getMemoryKind(", ".type as",
    ]) assert.equal(source.includes(forbidden), false, forbidden);
  }
});

test("Home Loader is the single Knowledge and Brain orchestration boundary", async () => {
  const loader = await readFile(new URL("../src/lib/home/loadHome.ts", import.meta.url), "utf8");
  const repository = await readFile(new URL("../src/lib/repositories/home/home.repository.ts", import.meta.url), "utf8");
  const assistant = await readFile(new URL("../src/hooks/useAssistantHomeContext.ts", import.meta.url), "utf8");
  assert.match(loader, /getHomeRepositoryData/);
  assert.match(loader, /buildAllPeopleKnowledge/);
  assert.match(loader, /buildInsights/);
  assert.equal((repository.match(/listKnowledge\(/g) ?? []).length, 1);
  assert.equal(assistant.includes("listKnowledge"), false);
  assert.equal(assistant.includes("getCurrentMemoryUserId"), false);
  assert.match(assistant, /data\.brainInsights/);
  assert.equal(assistant.includes("KnowledgeItem"), false);
  assert.match(assistant, /data\.assistantMemories/);
});
