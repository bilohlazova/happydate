import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  removeAssistantPrivateContext,
  replaceAssistantContext,
} from "../src/lib/assistant/verifiedAssistantRequest.ts";
import { assistantLocalDate } from "../src/lib/assistant/assistantLocalDate.ts";

function request() {
  return {
    message: "Help with Mum",
    locale: "en",
    conversation: [{ role: "user", content: "Earlier safe message" }],
    context: {
      currentDate: "2099-01-01",
      userName: "FORGED NAME",
      insight: { title: "FORGED INSIGHT", description: null, state: null },
      events: [{ id: "fake-event", title: "FORGED EVENT", date: "2026-08-20", category: null }],
      people: [{ id: "owned-person", name: "FORGED PERSON", relation: null, birthday: null, gender: null }],
      memories: [{ personName: "FORGED PERSON", memories: [{ title: null, content: "FORGED MEMORY", occurredOn: null, importance: null }] }],
      activePerson: { id: "owned-person", name: "FORGED PERSON", relation: null, birthday: null, gender: null },
      personResolutionStatus: "resolved",
    },
  };
}

test("authenticated context replaces every client-provided private fact", () => {
  const result = replaceAssistantContext(request(), {
    currentDate: "2026-08-16",
    userName: "Maria",
    events: [{ id: "real-event", title: "Mum birthday", date: "2026-08-20", category: "birthday" }],
    people: [{ id: "owned-person", name: "Natalia", relation: "parent", birthday: null, gender: "female" }],
    memories: [{ personName: "Natalia", memories: [{ title: null, content: "Likes tea", occurredOn: null, importance: 1 }] }],
  });
  assert.equal(result.message, "Help with Mum");
  assert.deepEqual(result.conversation, [{ role: "user", content: "Earlier safe message" }]);
  assert.equal(result.context.userName, "Maria");
  assert.equal(result.context.currentDate, "2026-08-16");
  assert.equal(result.context.activePerson?.name, "Natalia");
  assert.equal(result.context.personResolutionStatus, "resolved");
  assert.doesNotMatch(JSON.stringify(result.context), /FORGED|fake-event/);
});

test("an active person not present in the owner projection fails closed", () => {
  const result = replaceAssistantContext(request(), {
    currentDate: "2026-08-16", userName: null, events: [], people: [], memories: [],
  });
  assert.equal(result.context.activePerson, null);
  assert.equal(result.context.personResolutionStatus, "none");
});

test("guest requests keep conversation but receive no private context", () => {
  const result = removeAssistantPrivateContext(request());
  assert.equal(result.message, "Help with Mum");
  assert.deepEqual(result.context, {
    currentDate: null,
    userName: null,
    insight: null,
    events: [],
    people: [],
    memories: [],
    activePerson: null,
    personResolutionStatus: "none",
  });
});

test("server local date follows the owner timezone and invalid settings fail to UTC", () => {
  const instant = new Date("2026-08-16T23:30:00.000Z");
  assert.equal(assistantLocalDate(instant, "Europe/Warsaw"), "2026-08-17");
  assert.equal(assistantLocalDate(instant, "America/Los_Angeles"), "2026-08-16");
  assert.equal(assistantLocalDate(instant, "not/a-timezone"), "2026-08-16");
});

test("API uses bearer RLS context and never a service-role context loader", async () => {
  const route = await readFile(new URL("../src/app/api/ai-chat/route.ts", import.meta.url), "utf8");
  const identity = await readFile(new URL("../src/lib/assistant/chatIdentity.ts", import.meta.url), "utf8");
  const context = await readFile(new URL("../src/lib/assistant/verifiedAssistantContext.server.ts", import.meta.url), "utf8");
  assert.match(route, /createAssistantRlsClient/);
  assert.match(route, /prepareRequest: async/);
  assert.match(route, /getHomeRepositoryData\([\s\S]*?rlsSession\.client,[\s\S]*?identity\.userId,[\s\S]*?rlsSession\.accessToken/);
  assert.match(route, /buildVerifiedAssistantRequest/);
  assert.match(identity, /global: \{ headers: \{ Authorization:/);
  assert.match(context, /replaceAssistantContext/);
  assert.match(context, /logOrchestrationEvent\([\s\S]*?"assistant",[\s\S]*?data\.errors\.length \? "degraded" : "prepared",[\s\S]*?brains\.trace,[\s\S]*?ASSISTANT_BEHAVIOR_MANIFEST\.behaviorVersion/);
  assert.doesNotMatch(`${route}\n${identity}\n${context}`, /SUPABASE_SERVICE_ROLE_KEY|service_role/);
});
