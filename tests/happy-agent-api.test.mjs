import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const { createHappyAgentResponse } = await import("../src/lib/happy/agent/happyAgentServer.ts");
const knowledgeId = "11111111-1111-4111-8111-111111111111";
const context = { intent: "birthday_gift", user: { locale: "uk", timezone: "UTC" }, knowledge: { likes: [{ id: knowledgeId, text: "Tea", importance: 5, kind: "preference", category: null, polarity: "likes", occurredOn: null }] } };

test("Happy Agent maps only validated birthday proposals and never model-owned database fields", async () => {
  const response = await createHappyAgentResponse({ intent: "birthday_gift", context, provider: async () => ({ message: "One direction", idea: { title: "Tea set", message: "Matches likes", reasonSources: [{ type: "knowledge", id: knowledgeId }] } }) });
  assert.deepEqual(response, { message: "One direction", proposedIdea: { type: "gift", title: "Tea set", message: "Matches likes" }, ui: [{ type: "gift_recommendation", gift: { title: "Tea set", description: "Matches likes" }, reasons: [{ source: { type: "knowledge", id: knowledgeId }, sourceType: "preference", label: "Tea" }], actions: ["save", "dismiss", "more_like_this"] }] });
  await assert.rejects(() => createHappyAgentResponse({ intent: "birthday_gift", context, provider: async () => ({ message: "x", task: { id: "invented" } }) }));
  await assert.rejects(() => createHappyAgentResponse({ intent: "birthday_gift", context, provider: async () => ({}) }));
});

test("Happy Agent greeting is message-only and rejects model ideas", async () => {
  const response = await createHappyAgentResponse({ intent: "write_greeting", context: { ...context, intent: "write_greeting" }, provider: async () => ({ message: "Happy birthday" }) });
  assert.deepEqual(response, { message: "Happy birthday" });
  await assert.rejects(() => createHappyAgentResponse({ intent: "write_greeting", context: { ...context, intent: "write_greeting" }, provider: async () => ({ message: "x", idea: { title: "no", message: "no" } }) }));
});

test("Happy Agent strict model boundary rejects every non-contract decision field", async () => {
  const forbidden = [
    "unknown", "task", "action", "taskId", "actionId", "userId", "personId", "eventId", "proposedIdea", "persistence",
  ];
  for (const key of forbidden) {
    await assert.rejects(() => createHappyAgentResponse({ intent: "birthday_gift", context, provider: async () => ({ message: "safe", [key]: { arbitrary: true } }) }), key);
  }
  await assert.rejects(() => createHappyAgentResponse({ intent: "birthday_gift", context, provider: async () => ({ idea: { title: "x", message: "x", metadata: {} } }) }));
  await assert.rejects(() => createHappyAgentResponse({ intent: "birthday_gift", context, provider: async () => ({ message: "x".repeat(1501) }) }));
  await assert.rejects(() => createHappyAgentResponse({ intent: "birthday_gift", context, provider: async () => ({ idea: { title: "x".repeat(301), message: "x" } }) }));
  await assert.rejects(() => createHappyAgentResponse({ intent: "birthday_gift", context, provider: async () => ({ idea: { title: "x", message: { arbitrary: true } } }) }));
});

test("Happy Agent route is authenticated, bounded, RLS-scoped and read-only", async () => {
  const route = await readFile(new URL("../src/app/api/happy/agent/route.ts", import.meta.url), "utf8");
  assert.match(route, /readBoundedJson\(request, 8 \* 1024\)/);
  assert.match(route, /getAssistantRequestIdentity/);
  assert.match(route, /createAssistantRlsClient/);
  assert.match(route, /buildHappyAgentContext/);
  assert.match(route, /selectHappyAgentContextForIntent/);
  assert.match(route, /createConfiguredAssistantRateLimiter/);
  assert.match(route, /createConfiguredAiBudget/);
  assert.doesNotMatch(route, /service_role|\.from\([^)]*\)\.(?:insert|update|delete)\(/);
});
