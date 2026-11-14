import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import "./server-test-loader.mjs";
import { assertStrictObjectSchemas, withOpenAiOutput } from "./helpers/openaiStructuredOutputHarness.mjs";

const { createOpenAiHappyAgentProvider } = await import("../src/lib/happy/agent/happyAgentProvider.server.ts");
const { happyUIBlockSchema } = await import("../src/lib/happy/ui/happyUIBlock.ts");

const { createHappyAgentResponse } = await import("../src/lib/happy/agent/happyAgentServer.ts");
const knowledgeId = "11111111-1111-4111-8111-111111111111";
const context = { intent: "birthday_gift", user: { locale: "uk", timezone: "UTC" }, knowledge: { likes: [{ id: knowledgeId, text: "Tea", importance: 5, kind: "preference", category: null, polarity: "likes", occurredOn: null }] } };

const ideaOutput = { title: "Tea set", message: "Based on the stated tea preference", reasonSources: [{ type: "knowledge", id: knowledgeId }] };
const callProvider = (intent = "birthday_gift", suppliedContext = context) => createHappyAgentResponse({ intent, context: suppliedContext, provider: createOpenAiHappyAgentProvider("synthetic-key") });

test("actual birthday SDK schema is strict at every object and includes provenance", async () => {
  const { value, requests } = await withOpenAiOutput({ message: "A possible gift", idea: ideaOutput }, () => callProvider());
  assert.equal(requests.length, 1);
  const schema = requests[0].text.format.schema;
  assertStrictObjectSchemas(schema);
  assert.ok(schema.properties.idea.properties?.reasonSources ?? schema.properties.idea.anyOf?.some(branch => branch.properties?.reasonSources));
  assert.equal(happyUIBlockSchema.safeParse(value.ui[0]).success, true);
  assert.equal(value.ui[0].reasons[0].label, "Tea");
});

test("birthday provider normalizes nullable idea for a message-only domain response", async () => {
  const { value } = await withOpenAiOutput({ message: "Please share a confirmed preference", idea: null }, () => callProvider());
  assert.deepEqual(value, { message: "Please share a confirmed preference" });
});

test("birthday provider normalizes nullable message without dropping a sourced idea", async () => {
  const { value } = await withOpenAiOutput({ message: null, idea: ideaOutput }, () => callProvider());
  assert.equal(value.message, undefined);
  assert.equal(value.ui[0].reasons[0].source.id, knowledgeId);
});

test("provider output cannot invent, retype, or duplicate provenance references", async () => {
  for (const refs of [[{ type: "knowledge", id: "22222222-2222-4222-8222-222222222222" }], [{ type: "gift", id: knowledgeId }], [ideaOutput.reasonSources[0], ideaOutput.reasonSources[0]]]) {
    await assert.rejects(() => withOpenAiOutput({ message: null, idea: { ...ideaOutput, reasonSources: refs } }, () => callProvider()));
  }
});

test("SDK reference enums are restricted to each permitted source type and exclude planned gifts", async () => {
  const memoryId = "22222222-2222-4222-8222-222222222222";
  const giftId = "33333333-3333-4333-8333-333333333333";
  const plannedId = "44444444-4444-4444-8444-444444444444";
  const supplied = { ...context, memories: [{ id: memoryId, text: "A shared tea tasting", epistemicType: "memory", authority: "user" }], gifts: { previous: [{ id: giftId, title: "Tea", lifecycle: "given", eventId: null, createdAt: "2026-01-01" }], planned: [{ id: plannedId, title: "Unconfirmed idea", lifecycle: "planned", eventId: null, createdAt: "2026-01-01" }] } };
  for (const ref of [{ type: "knowledge", id: knowledgeId }, { type: "memory", id: memoryId }, { type: "gift", id: giftId }]) {
    const { value, requests } = await withOpenAiOutput({ message: null, idea: { ...ideaOutput, reasonSources: [ref] } }, () => callProvider("birthday_gift", supplied));
    const branches = requests[0].text.format.schema.properties.idea.properties.reasonSources.items.anyOf;
    assertStrictObjectSchemas(requests[0].text.format.schema);
    assert.deepEqual(branches.map(branch => [branch.properties.type.enum[0], branch.properties.id.enum]), [["knowledge", [knowledgeId]], ["memory", [memoryId]], ["gift", [giftId]]]);
    assert.deepEqual(value.ui[0].reasons[0].source, ref);
  }
  await assert.rejects(() => withOpenAiOutput({ message: null, idea: { ...ideaOutput, reasonSources: [{ type: "gift", id: plannedId }] } }, () => callProvider("birthday_gift", supplied)));
});

test("no provenance context permits only a message and still rejects an empty response", async () => {
  const emptyContext = { intent: "birthday_gift", user: context.user };
  const { value, requests } = await withOpenAiOutput({ message: "Please provide a preference", idea: null }, () => callProvider("birthday_gift", emptyContext));
  assert.deepEqual(value, { message: "Please provide a preference" });
  assertStrictObjectSchemas(requests[0].text.format.schema);
  assert.deepEqual(requests[0].text.format.schema.properties.idea, { type: "null" });
  await assert.rejects(() => withOpenAiOutput({ message: null, idea: null }, () => callProvider("birthday_gift", emptyContext)));
});

test("actual greeting provider remains message-only with no gift or write authority", async () => {
  const { value, requests } = await withOpenAiOutput({ message: "Happy birthday" }, () => callProvider("write_greeting", { ...context, intent: "write_greeting" }));
  assert.deepEqual(value, { message: "Happy birthday" });
  assertStrictObjectSchemas(requests[0].text.format.schema);
  assert.deepEqual(Object.keys(requests[0].text.format.schema.properties), ["message"]);
  await assert.rejects(() => withOpenAiOutput({ message: "safe", idea: null, persistence: { userId: knowledgeId } }, () => callProvider()));
});

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
