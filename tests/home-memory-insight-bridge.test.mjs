import assert from "node:assert/strict";
import test from "node:test";

import {
  composeHomeCards,
  mapInsightToHappyCard,
  safelyBuildHomeRecommendation,
  selectHomeMemoryInsight,
} from "../src/lib/happy/brain/mapInsightToHappyCard.ts";

function insight(type, overrides = {}) {
  return {
    id: `${type}-olek`,
    type,
    priority: 799,
    icon: "💡",
    title: "Tytuł z Insight",
    description: "Opis z Insight",
    personId: "olek",
    eventId: "birthday-olek",
    reason: "upcoming_event_and_person_context",
    action: { label: "Canonical label", action: "/people/olek" },
    metadata: { sourceMemoryIds: ["memory-1"] },
    ...overrides,
  };
}

function card(id, overrides = {}) {
  return {
    id,
    type: "reminder",
    priority: "high",
    icon: "🎂",
    title: "Urodziny Olka",
    description: "Warto przygotować prezent wcześniej.",
    actionLabel: "Przejdź",
    actionRoute: "/people/olek",
    ...overrides,
  };
}

test("gift_saved maps to the existing Home card model", () => {
  const result = mapInsightToHappyCard(
    insight("gift_saved", { title: "Masz już pomysł dla Olka" }),
  );
  assert.equal(result?.type, "idea");
  assert.equal(result?.actionLabel, "Zobacz pomysł");
  assert.equal(result?.title, "Masz już pomysł dla Olka");
});

test("gift_suggestion_ready maps without rewriting canonical copy", () => {
  const source = insight("gift_suggestion_ready");
  const result = mapInsightToHappyCard(source);
  assert.equal(result?.actionLabel, "Zobacz profil");
  assert.equal(result?.title, source.title);
  assert.equal(result?.description, source.description);
});

test("missing_person_context maps to add-information action", () => {
  const result = mapInsightToHappyCard(insight("missing_person_context"));
  assert.equal(result?.type, "idea");
  assert.equal(result?.actionLabel, "Dodaj informację");
});

test("recent_memory maps to a memory card", () => {
  const result = mapInsightToHappyCard(
    insight("recent_memory", { priority: 50, reason: "recent_linked_memory" }),
  );
  assert.equal(result?.type, "memory");
  assert.equal(result?.priority, "low");
  assert.equal(result?.actionLabel, "Zobacz osobę");
});

test("unsupported canonical insight returns null", () => {
  assert.equal(mapInsightToHappyCard(insight("next_event")), null);
});

test("journal-shaped insight cannot map", () => {
  const privateText = "PRYWATNY DZIENNIK";
  const result = mapInsightToHappyCard(
    insight("journal", { title: privateText, description: privateText }),
  );
  assert.equal(result, null);
});

test("insight without a linked person cannot map", () => {
  assert.equal(
    mapInsightToHappyCard(insight("gift_saved", { personId: undefined })),
    null,
  );
});

test("person route must belong to the linked person", () => {
  assert.equal(
    mapInsightToHappyCard(
      insight("gift_saved", {
        personId: "olek",
        action: { label: "Ignored", action: "/people/kasia" },
      }),
    ),
    null,
  );
});

test("highest-priority supported insight wins", () => {
  const selected = selectHomeMemoryInsight([
    insight("recent_memory", { id: "recent", priority: 50 }),
    insight("gift_saved", { id: "gift", priority: 799 }),
  ]);
  assert.equal(selected?.id, "gift");
});

test("equal priority uses the nearest linked event", () => {
  const selected = selectHomeMemoryInsight(
    [
      insight("gift_saved", { id: "later", eventId: "later-event" }),
      insight("gift_saved", { id: "nearer", eventId: "near-event" }),
    ],
    {
      eventDatesById: new Map([
        ["later-event", new Date(2026, 6, 23)],
        ["near-event", new Date(2026, 6, 18)],
      ]),
    },
  );
  assert.equal(selected?.id, "nearer");
});

test("stable id ordering makes equal inputs deterministic", () => {
  const inputs = [
    insight("gift_saved", { id: "z-result", eventId: undefined }),
    insight("gift_saved", { id: "a-result", eventId: undefined }),
  ];
  assert.equal(selectHomeMemoryInsight(inputs)?.id, "a-result");
  assert.equal(selectHomeMemoryInsight([...inputs].reverse())?.id, "a-result");
});

test("primary event card remains unchanged when secondary is added", () => {
  const primary = card("birthday-olek");
  const secondary = mapInsightToHappyCard(insight("gift_saved"));
  const result = composeHomeCards([primary], [], secondary);
  assert.strictEqual(result[0], primary);
  assert.deepEqual(result[0], primary);
  assert.equal(result.length, 2);
});

test("event insight is not rendered again as same-person secondary content", () => {
  const primary = card("birthday-olek");
  const unsupportedSecondary = mapInsightToHappyCard(
    insight("next_event", { title: primary.title }),
  );
  const result = composeHomeCards([primary], [], unsupportedSecondary);
  assert.deepEqual(result, [primary]);
});

test("same-person duplicate copy falls back to current Home recommendations", () => {
  const primary = card("birthday-olek", { personId: "olek" });
  const existing = card("legacy-memory", { type: "memory" });
  const duplicate = mapInsightToHappyCard(
    insight("gift_saved", { title: primary.title }),
  );
  assert.deepEqual(composeHomeCards([primary], [existing], duplicate), [
    primary,
    existing,
  ]);
});

test("no insight preserves the current Home cards", () => {
  const primary = card("birthday-olek");
  const existing = card("legacy-memory", { type: "memory" });
  assert.deepEqual(composeHomeCards([primary], [existing], null), [primary, existing]);
});

test("mapper preserves the canonical action URL", () => {
  const result = mapInsightToHappyCard(
    insight("gift_saved", { action: { label: "Ignored", action: "/people/olek" } }),
  );
  assert.equal(result?.actionRoute, "/people/olek");
});

test("reason, source insight id and source memory ids are preserved", () => {
  const source = insight("gift_saved", {
    id: "source-123",
    reason: "upcoming_event_and_saved_gift",
    metadata: { sourceMemoryIds: ["gift-9"] },
  });
  const result = mapInsightToHappyCard(source);
  assert.equal(result?.reason, "upcoming_event_and_saved_gift");
  assert.equal(result?.sourceInsightId, "source-123");
  assert.deepEqual(result?.sourceMemoryIds, ["gift-9"]);
});

test("recommendation failure does not suppress primary briefing", () => {
  let warned = false;
  const recommendation = safelyBuildHomeRecommendation(
    () => {
      throw new Error("test failure");
    },
    () => {
      warned = true;
    },
  );
  const primary = card("birthday-olek");
  assert.equal(recommendation, null);
  assert.equal(warned, true);
  assert.deepEqual(composeHomeCards([primary], [], recommendation), [primary]);
});

test("only one selected memory recommendation is composed", () => {
  const selected = selectHomeMemoryInsight([
    insight("gift_saved", { id: "gift" }),
    insight("gift_suggestion_ready", { id: "context" }),
  ]);
  const result = composeHomeCards(
    [card("birthday-olek")],
    [],
    selected ? mapInsightToHappyCard(selected) : null,
  );
  assert.equal(result.filter((item) => item.sourceInsightId).length, 1);
  assert.equal(result.at(-1)?.sourceInsightId, "gift");
});
