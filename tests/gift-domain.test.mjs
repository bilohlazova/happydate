import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildGiftCollectionViewModel,
  mapKnowledgeToGiftLifecycle,
  mapKnowledgeToGifts,
} from "../src/lib/gifts/gift.mapper.ts";

function item(overrides = {}) {
  return {
    id: "gift-1", personId: "person-1", eventId: null, kind: "gift",
    category: "idea", polarity: null, title: null, value: "Kindle",
    occurredOn: null, importance: 0, tags: [], summary: null, state: "active",
    aiEligible: true, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: null,
    legacyType: "gift", evidence: { sourceKind: "legacy", sourceId: "gift-1", originalText: "Kindle", capturedAt: null },
    classification: null, compatibility: { valueText: "Kindle", contentText: null },
    ...overrides,
  };
}

test("Gift Domain supports exactly the approved lifecycle", async () => {
  const types = await readFile(new URL("../src/lib/gifts/gift.types.ts", import.meta.url), "utf8");
  assert.deepEqual(
    ["idea", "selected", "purchased", "given"].map((category) =>
      mapKnowledgeToGiftLifecycle(item({ category, classification: category === "given" ? { userConfirmed: true } : null }))
    ),
    ["idea", "selected", "purchased", "given"],
  );
  assert.match(types, /\["idea", "selected", "purchased", "given"\]/);
  assert.doesNotMatch(types, /"history"|"ordered"|"ready"/);
});

test("only explicitly confirmed given gifts become history", () => {
  const gifts = mapKnowledgeToGifts([
    item({ id: "idea", category: "idea" }),
    item({ id: "selected", category: "selected" }),
    item({ id: "purchased", category: "purchased" }),
    item({ id: "unconfirmed", category: "given" }),
    item({ id: "legacy-history", category: "history" }),
    item({ id: "given", category: "given", classification: { userConfirmed: true } }),
  ]);
  const model = buildGiftCollectionViewModel(gifts);
  assert.deepEqual(
    model.activeIdeas.map((gift) => gift.lifecycle).sort(),
    ["idea", "purchased", "selected"],
  );
  assert.deepEqual(model.history.map((gift) => gift.id), ["given"]);
  assert.deepEqual(model.counts, { idea: 1, selected: 1, purchased: 1, given: 1 });
});

test("archived, non-gift and empty records do not enter Gift Domain", () => {
  assert.deepEqual(mapKnowledgeToGifts([
    item({ id: "archived", state: "archived" }),
    item({ id: "journal", kind: "journal" }),
    item({ id: "empty", value: "", title: null, summary: null }),
  ]), []);
});

test("Gift Repository hides persistence and loaders remain UI-independent", async () => {
  const repository = await readFile(new URL("../src/lib/gifts/gift.repository.ts", import.meta.url), "utf8");
  const loaders = await readFile(new URL("../src/lib/gifts/gift.loaders.ts", import.meta.url), "utf8");
  const uiFiles = await readFile(new URL("../src/app/gift/start/page.tsx", import.meta.url), "utf8");
  assert.match(repository, /listKnowledge/);
  for (const forbidden of ["supabase", '.from("memories")', "MemoryRow", "value_text", "content_text"]) {
    assert.equal(repository.includes(forbidden), false, forbidden);
  }
  assert.equal((loaders.match(/auth\.getUser\(\)/g) ?? []).length, 1);
  assert.equal(uiFiles.includes("gift.loaders"), false);
});

test("AI Gift Cache compatibility paths remain present and unchanged", async () => {
  const repository = await readFile(new URL("../src/lib/repositories/giftIntelligenceRepository.server.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../src/app/api/ai/gift-suggestions/route.ts", import.meta.url), "utf8");
  for (const api of ["getCachedGiftIdeas", "saveGiftIdeas", "loadGiftIntelligenceSource", "loadLegacyGiftNotes"]) {
    assert.match(repository, new RegExp(`export async function ${api}`));
    assert.ok(route.includes(`${api}(`));
  }
});
