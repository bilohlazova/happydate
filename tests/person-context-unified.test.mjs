import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildUnifiedPersonContext } from "../src/lib/person-context/buildUnifiedPersonContext.ts";

const knowledge = [{
  id: "k1", personId: "p1", eventId: null, kind: "fact", category: null, polarity: null,
  title: null, value: "Allergic to lilies", occurredOn: null, importance: 3, tags: [], summary: null,
  state: "active", aiEligible: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: null,
  legacyType: "fact", evidence: { sourceKind: "legacy", sourceId: "k1", originalText: "Allergic to lilies", capturedAt: null },
  classification: null, compatibility: { valueText: "Allergic to lilies", contentText: null },
}];

test("one unified profile feeds chat and structured AI from the same facts", () => {
  const context = buildUnifiedPersonContext({
    personId: "p1", personName: "Natalia", relationLabel: "mother", birthday: "1970-08-21",
    knowledge, pets: [{ name: "Rex", species: "dog", note: null }],
    happyConversations: [
      { id: "c1", userMessage: "She started painting", happyResponse: "Lovely!", createdAt: "2026-02-01T00:00:00Z" },
    ],
    locale: "en",
  });
  assert.match(context.forChat ?? "", /Allergic to lilies/);
  assert.equal(context.forStructuredAi.name, "Natalia");
  assert.deepEqual(context.forStructuredAi.pets, [{ name: "Rex", species: "dog" }]);
  assert.deepEqual(context.forStructuredAi.recentUserStatements, ["She started painting"]);
  assert.equal(JSON.stringify(context.forStructuredAi).includes("Lovely!"), false, "Happy's own replies are never user statements");
});

test("chat, gifts and Care Brain are wired to the shared context", async () => {
  const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
  const [chatRoute, giftRoute, orchestrator, verified] = await Promise.all([
    read("../src/app/api/ai-chat/route.ts"),
    read("../src/lib/gift-intelligence/giftRecommendationService.server.ts"),
    read("../src/lib/home/orchestrateHomeBrains.ts"),
    read("../src/lib/assistant/verifiedAssistantContext.server.ts"),
  ]);
  assert.match(chatRoute, /buildUnifiedPersonContext/);
  assert.match(giftRoute, /buildUnifiedPersonContext/);
  assert.match(orchestrator, /careInsight/);
  assert.match(verified, /insight: isExplicitScope \? null : brains\.conversation\.careInsight/);
});

test("chat reaches gifts through the shared pipeline as a verified-person tool", async () => {
  const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
  const [chatRoute, tool, service, giftRoute, chatServer] = await Promise.all([
    read("../src/app/api/ai-chat/route.ts"),
    read("../src/lib/assistant/giftTool.server.ts"),
    read("../src/lib/gift-intelligence/giftRecommendationService.server.ts"),
    read("../src/app/api/ai/gift-suggestions/route.ts"),
    read("../src/lib/assistant/chatServer.ts"),
  ]);
  // One pipeline, two entry points.
  assert.match(tool, /runGiftRecommendationPipeline/);
  assert.match(giftRoute, /runGiftRecommendationPipeline/);
  assert.match(service, /export function runGiftRecommendationPipeline/);
  // The model never chooses the recipient: no person argument in the tool schema.
  const schema = tool.slice(tool.indexOf("parameters:"), tool.indexOf("export type SuggestGiftsArgs"));
  assert.doesNotMatch(schema, /person/i);
  assert.match(chatRoute, /toolPersonId = verifiedRequest\.context\.personResolutionStatus === "resolved"/);
  assert.match(chatRoute, /giftToolEnabled = verifiedContextReady && Boolean\(toolPersonId\)/);
  // Ideas shown on the gift page reach the chat and are not repeated.
  assert.match(chatRoute, /listShownGiftIdeas/);
  assert.match(chatRoute, /formatShownIdeasContext/);
  assert.match(await read("../src/lib/gift-intelligence/shownGiftIdeas.ts"), /GIFT IDEAS ALREADY SHOWN TO THE USER/);
  assert.match(chatServer, /serverShownGiftIdeasContext/);
});
