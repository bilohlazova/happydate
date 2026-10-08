import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseAssistantChatRequest } from "../src/lib/assistant/chatContract.ts";

const base = (scope) => ({ message: "Help", locale: "en", conversation: [], ...(scope === undefined ? {} : { scope }), context: {} });

test("canonical chat scope accepts only strict root-resource shapes and preserves legacy global", () => {
  assert.deepEqual(parseAssistantChatRequest(base()).data?.scope, { type: "global" });
  assert.deepEqual(parseAssistantChatRequest(base({ type: "global" })).data?.scope, { type: "global" });
  assert.deepEqual(parseAssistantChatRequest(base({ type: "person", personId: "11111111-1111-4111-8111-111111111111" })).data?.scope, { type: "person", personId: "11111111-1111-4111-8111-111111111111" });
  assert.equal(parseAssistantChatRequest(base({ type: "event", eventId: "11111111-1111-4111-8111-111111111111", personId: "22222222-2222-4222-8222-222222222222" })).success, false);
  assert.equal(parseAssistantChatRequest(base({ type: "task", taskId: "11111111-1111-4111-8111-111111111111", eventId: "22222222-2222-4222-8222-222222222222" })).success, false);
  assert.equal(parseAssistantChatRequest(base({ type: "unknown" })).success, false);
  assert.equal(parseAssistantChatRequest(base({ type: "person", personId: "not-a-uuid" })).success, false);
});

test("scope resolver is server-only, owner-scoped, and derives relationships from persistence", async () => {
  const source = await readFile("src/lib/assistant/chatScope.ts", "utf8");
  assert.match(source, /import "server-only"/);
  assert.match(source, /\.from\("people"\)\.select\("id"\)\.eq\("id", personId\)\.eq\("user_id", userId\)/);
  assert.match(source, /\.from\("events"\)\.select\("id,person_id"\)\.eq\("id", eventId\)\.eq\("user_id", userId\)/);
  assert.match(source, /\.from\("happy_tasks"\)\.select\("id,type,person_id,event_id"\)\.eq\("id", scope\.taskId\)\.eq\("user_id", userId\)/);
  assert.match(source, /event\.personId !== null && event\.personId !== data\.person_id/);
  assert.doesNotMatch(source, /select\("\*"\)|\.insert\(|\.update\(|\.delete\(/);
});

test("API resolves scope before context/provider work and fails safely for unauthenticated or foreign targets", async () => {
  const route = await readFile("src/app/api/ai-chat/route.ts", "utf8");
  assert.match(route, /parsed\.data\.scope\.type !== "global"/);
  assert.match(route, /status: 401/);
  assert.match(route, /resolveVerifiedChatScope/);
  assert.match(route, /ChatScopeNotFoundError/);
  assert.match(route, /status: 404/);
  assert.match(route, /buildVerifiedAssistantRequest\(clientRequest, homeData, verifiedScope/);
});

test("modal has one scope prop, person profile supplies only the persisted person id, and opening it does not call AI", async () => {
  const [modal, profile] = await Promise.all([
    readFile("src/components/ChatAssistantModal.tsx", "utf8"),
    readFile("src/components/people/PersonProfileContent.tsx", "utf8"),
  ]);
  assert.match(modal, /scope\?: ChatScopeInput/);
  assert.match(modal, /scope = \{ type: "global" \}/);
  assert.match(modal, /scope,\n          context:/);
  assert.doesNotMatch(modal, /initialPersonId|initialPerson/);
  assert.match(profile, /scope=\{\{ type: "person", personId: hero\.id \}\}/);
  assert.doesNotMatch(modal, /OpenAI|happyAgentProvider/);
});

test("verified context scopes people/events before provider formatting and keeps global behavior", async () => {
  const source = await readFile("src/lib/assistant/verifiedAssistantContext.server.ts", "utf8");
  assert.match(source, /scope\.type === "person" \|\| scope\.type === "event" \|\| scope\.type === "task"/);
  assert.match(source, /scopedEventId \? event\.id === scopedEventId/);
  assert.match(source, /isExplicitScope \? event\.personId === requestedPersonId : true/);
  assert.match(source, /const requestedGift = isExplicitScope \? null : request\.context\.giftRequest/);
  assert.match(source, /const scopedRequest: AssistantChatRequest/);
});
