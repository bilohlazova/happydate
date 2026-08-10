import assert from "node:assert/strict";
import test from "node:test";

import {
  formatGiftOutcomeAiContextExport,
  formatGiftOutcomeAiContextTime,
  GIFT_OUTCOME_AI_CONTEXT_LIMIT,
  projectGiftOutcomeAiContext,
} from "../src/lib/gift-intelligence/giftOutcomeAiContextPreview.ts";

test("short copied-at time follows locale and the copied version timezone", () => {
  const value = new Date("2026-08-09T10:11:12.000Z");
  assert.equal(formatGiftOutcomeAiContextTime(value, "en-GB", "Europe/Warsaw"), "12:11");
  assert.equal(formatGiftOutcomeAiContextTime(value, "en-US", "America/New_York"), "06:11 AM");
  assert.throws(() => formatGiftOutcomeAiContextTime(new Date("invalid"), "en", "UTC"), /Invalid export timestamp/);
});

test("AI outcome preview is bounded, normalized and ID-free", () => {
  const input = Array.from({ length: 12 }, (_, index) => ({
    giftTitle: `  Gift   ${index}  `,
    outcome: "liked",
    note: `  Note   ${index}  `,
    category: "other",
    categorySignal: "insufficient",
    giftId: `secret-${index}`,
    personId: "secret-person",
  }));
  const preview = projectGiftOutcomeAiContext(input);
  assert.equal(preview.length, GIFT_OUTCOME_AI_CONTEXT_LIMIT);
  assert.equal(preview[0].giftTitle, "Gift 0");
  assert.equal(preview[0].note, "Note 0");
  assert.deepEqual(Object.keys(preview[0]).sort(), ["category", "categorySignal", "giftTitle", "note", "outcome"]);
  assert.equal(JSON.stringify(preview).includes("secret"), false);
});

test("plain-text export contains only visible preview fields", () => {
  const generatedAt = new Date("2026-08-09T10:11:12.000Z");
  const text = formatGiftOutcomeAiContextExport([{
    giftTitle: "Coffee set",
    outcome: "liked",
    note: "Used every day",
    category: "food_drink",
    categorySignal: "insufficient",
  }], {
    heading: "AI context",
    generatedAt: (dateTime, zone) => `Export generated: ${dateTime} [${zone}]`,
    reaction: "Reaction",
    category: "Category",
    signal: "Signal",
    note: "Note",
    outcomeValue: (value) => value,
    signalValue: (value) => value,
    omittedOutcomes: (omitted, shown, limit) => `${shown}/${limit}; ${omitted} older outcomes omitted`,
  }, { generatedAt, locale: "en-GB", timeZone: "Europe/Warsaw" });
  assert.match(text, /AI context[\s\S]*Coffee set[\s\S]*Reaction: liked/);
  assert.match(text, /Export generated: 9 Aug 2026, 12:11:12 CEST \[Europe\/Warsaw\]/);
  assert.match(text, /Category: food_drink[\s\S]*Signal: insufficient/);
  assert.match(text, /Note: Used every day/);
  assert.doesNotMatch(text, /giftId|personId|userId|confirmedAt/);
  assert.doesNotMatch(text, /older outcomes omitted/);
});

test("plain-text export appends only an aggregate omitted-outcome footer", () => {
  const labels = {
    heading: "AI context",
    generatedAt: (dateTime, zone) => `Generated ${dateTime} (${zone})`,
    reaction: "Reaction",
    category: "Category",
    signal: "Signal",
    note: "Note",
    outcomeValue: (value) => value,
    signalValue: (value) => value,
    omittedOutcomes: (omitted, shown, limit) => `Exported ${shown}/${limit}. Privacy: ${omitted} older outcomes omitted`,
  };
  const options = { generatedAt: new Date("2026-08-09T10:11:12.000Z"), locale: "en-GB", timeZone: "UTC" };
  const text = formatGiftOutcomeAiContextExport([], labels, { ...options, omittedCount: 3.9 });
  assert.equal(text, `AI context\n\nGenerated 9 Aug 2026, 10:11:12 UTC (UTC)\n\nExported 0/${GIFT_OUTCOME_AI_CONTEXT_LIMIT}. Privacy: 3 older outcomes omitted`);
  assert.equal(formatGiftOutcomeAiContextExport([], labels, { ...options, omittedCount: -2 }), "AI context\n\nGenerated 9 Aug 2026, 10:11:12 UTC (UTC)");
});

test("plain-text export rejects invalid generated-at metadata", () => {
  const labels = {
    heading: "AI context",
    generatedAt: (dateTime, zone) => `${dateTime} ${zone}`,
    reaction: "Reaction",
    category: "Category",
    signal: "Signal",
    note: "Note",
    outcomeValue: (value) => value,
    signalValue: (value) => value,
    omittedOutcomes: () => "omitted",
  };
  assert.throws(() => formatGiftOutcomeAiContextExport([], labels, {
    generatedAt: new Date("invalid"), locale: "en", timeZone: "UTC",
  }), /Invalid export timestamp/);
  assert.throws(() => formatGiftOutcomeAiContextExport([], labels, {
    generatedAt: new Date(), locale: "en", timeZone: "Not/AZone",
  }), RangeError);
});

test("AI outcome preview enforces title and note limits", () => {
  const [item] = projectGiftOutcomeAiContext([{
    giftTitle: "G".repeat(300),
    outcome: "unsure",
    note: "N".repeat(600),
    category: "other",
    categorySignal: "insufficient",
  }]);
  assert.equal(item.giftTitle.length, 240);
  assert.equal(item.note?.length, 500);
});
