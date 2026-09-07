import assert from "node:assert/strict";
import test from "node:test";
import {
  formatPersonMemoryProfileForAssistant,
  gentleSymbolInterpretation,
  noticeRelationshipConnections,
  selectAuthoritativeContextForAi,
} from "../src/lib/memory-engine/index.ts";

test("symbol interpretation is explicitly gentle and leaves authority with the user", () => {
  const result = gentleSymbolInterpretation({ locale: "uk", kind: "drawing" });
  assert.match(result.text, /якщо тобі це відгукується/i);
  assert.match(result.text, /не істина і не діагноз/i);
});

test("relationship intelligence needs repeated user memories and returns observations, not facts", () => {
  const entries = [
    { id: "m1", epistemicType: "memory", authority: "user", text: "Разом були біля моря", occurredOn: null },
    { id: "m2", epistemicType: "memory", authority: "user", text: "Згадували нашу подорож до моря", occurredOn: null },
  ];
  const observations = noticeRelationshipConnections(entries, "uk");
  assert.equal(observations.length, 1);
  assert.match(observations[0].summary, /лише спостереження/i);
  assert.deepEqual(observations[0].relatedEntryIds, ["m1", "m2"]);
});

test("assistant profile puts user meaning before Happy interpretation and labels authority", () => {
  const userFact = { id: "f1", epistemicType: "fact", authority: "user", text: "Любить море", occurredOn: null };
  const profile = {
    personId: "p1", personName: "Іван",
    who: { relationLabel: "друг", birthday: null },
    ourStory: { userMeaning: "Це наш спокій", happyInterpretation: "Може нагадувати цілісність" },
    chronology: [], facts: [userFact], memories: [], dates: [], gifts: [], pets: [], notes: [], observations: [], happyConversations: [],
    symbol: { kind: "drawing", name: null, presetKey: null, hasImage: true, userMeaning: "Це наш спокій", happyInterpretation: "Може нагадувати цілісність", disclaimerVersion: "gentle-inspiration-v1" },
  };
  const formatted = formatPersonMemoryProfileForAssistant(profile);
  assert.ok(formatted.indexOf("USER MEANING") < formatted.indexOf("HAPPY SYMBOL INTERPRETATION"));
  assert.match(formatted, /HIGHEST AUTHORITY/);
  assert.deepEqual(selectAuthoritativeContextForAi(profile).factsAndMemories, [userFact]);
});
