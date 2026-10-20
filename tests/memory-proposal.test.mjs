import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("memory proposal boundary is server-only and has a strict structured candidate", async () => {
  const source = await read("src/lib/happy/actions/memoryProposal.server.ts");
  assert.match(source, /import ["']server-only["']/);
  assert.match(source, /memoryProposalCandidateSchema = z\.object/);
  assert.match(source, /general_person_knowledge/);
  assert.match(source, /task_local/);
  assert.match(source, /\.strict\(\)/);
});

test("person scope derives the target person without trusting provider IDs", async () => {
  const source = await read("src/lib/happy/actions/memoryProposal.server.ts");
  assert.match(source, /scope\.type === "global" \|\| !scope\.personId/);
  assert.match(source, /personId: scope\.personId/);
  assert.doesNotMatch(source, /candidate[^\n]*personId/);
});

test("event and task scopes use their verified person and task linkage", async () => {
  const source = await read("src/lib/happy/actions/memoryProposal.server.ts");
  assert.match(source, /scope\.type === "task" \? scope\.taskId : null/);
  assert.match(source, /target\.personId/);
  const scope = await read("src/lib/assistant/chatScope.ts");
  assert.match(scope, /ownedEvent/);
  assert.match(scope, /happy_tasks.*select\("id,type,person_id,event_id"\)/);
});

test("global and personless scopes produce no proposal", async () => {
  const source = await read("src/lib/happy/actions/memoryProposal.server.ts");
  assert.match(source, /reason: input\.scope\.type === "global" \? "global_scope" : "no_person"/);
});

test("only general person knowledge is eligible; task-local and uncertain input is suppressed", async () => {
  const source = await read("src/lib/happy/actions/memoryProposal.server.ts");
  assert.match(source, /parsed\.data\.kind !== "general_person_knowledge"/);
  assert.match(source, /reason: "not_general"/);
});

test("proposal content must come from the current user message", async () => {
  const source = await read("src/lib/happy/actions/memoryProposal.server.ts");
  assert.match(source, /normalizedMessage\.includes\(normalizedContent\)/);
  assert.match(source, /reason: "not_user_source"/);
  assert.doesNotMatch(source, /responseText|assistantMessage|happyResponse/);
});

test("proposal persists only a pending save_memory action", async () => {
  const source = await read("src/lib/happy/actions/memoryProposal.server.ts");
  assert.match(source, /type: "save_memory"/);
  assert.match(source, /status: "pending"/);
  assert.match(source, /payload: \{ personId: target\.personId, content: parsed\.data\.content \}/);
  assert.doesNotMatch(source, /\.from\("memories"\)\.insert|createKnowledge/);
});

test("action payload is canonical Tool Policy shape and target is server-derived", async () => {
  const tools = await read("src/lib/happy/tools/happyTools.ts");
  const source = await read("src/lib/happy/actions/memoryProposal.server.ts");
  assert.match(tools, /save_memory/);
  assert.match(tools, /personId: uuid, content/);
  assert.match(source, /payload: \{ personId: target\.personId/);
  assert.doesNotMatch(source, /payload: \{[^}]*userId/);
});

test("existing identical active Knowledge is not proposed again", async () => {
  const source = await read("src/lib/happy/actions/memoryProposal.server.ts");
  assert.match(source, /hasActiveKnowledgeValueWithClient/);
  const repository = await read("src/lib/repositories/knowledgeRepository.ts");
  assert.match(repository, /\.from\("memories"\)/);
  assert.match(repository, /\.eq\("is_active", true\)/);
  assert.match(source, /kind: "already_known"/);
});

test("conflicting Knowledge is never overwritten by the proposal path", async () => {
  const source = await read("src/lib/happy/actions/memoryProposal.server.ts");
  assert.doesNotMatch(source, /\.from\("memories"\)\.(update|upsert)/);
  assert.doesNotMatch(source, /\.from\("knowledge"\)\.(update|upsert)/);
});

test("idempotency key is stable and scoped to user, person, message, and content", async () => {
  const source = await read("src/lib/happy/actions/memoryProposal.server.ts");
  assert.match(source, /memory-proposal:/);
  assert.match(source, /userId, personId, message: normalize\(message\), content: normalize\(content\)/);
  assert.match(source, /eq\("idempotency_key", key\)/);
  assert.match(source, /kind: "already_pending"/);
});

test("route accepts structured provider output but never parses assistant text", async () => {
  const server = await read("src/lib/assistant/chatServer.ts");
  const route = await read("src/app/api/ai-chat/route.ts");
  assert.match(server, /memoryProposal\?: unknown/);
  assert.match(server, /onCompleted\?\.\(request, completedText, structuredProposal\)/);
  assert.match(route, /createMemoryProposalFromCandidate/);
  assert.doesNotMatch(route, /responseText.*match|regex|RegExp/);
});

test("the real chat provider uses one same-turn structured propose_memory tool", async () => {
  const route = await read("src/app/api/ai-chat/route.ts");
  assert.match(route, /name: "propose_memory"/);
  assert.match(route, /tool_choice: "auto"/);
  assert.match(route, /toolArguments/);
  assert.match(route, /JSON\.parse\(first\.arguments\)/);
  assert.doesNotMatch(route, /await openai\.chat\.completions\.create[\s\S]*await openai\.chat\.completions\.create/);
});

test("proposal is fail-closed when verified context is unavailable", async () => {
  const route = await read("src/app/api/ai-chat/route.ts");
  assert.match(route, /let verifiedContextReady = false/);
  assert.match(route, /if \(verifiedContextReady && verifiedScope\)/);
  assert.match(route, /verifiedContextReady = false/);
});

test("chat scope remains RLS-owned and rejects foreign person/event/task scopes", async () => {
  const source = await read("src/lib/assistant/chatScope.ts");
  assert.match(source, /eq\("user_id", userId\)/);
  assert.match(source, /throw new ChatScopeNotFoundError/);
});

test("approval still reuses the existing save_memory executor", async () => {
  const source = await read("src/lib/happy/actions/actionExecutor.server.ts");
  assert.match(source, /action\.type === "save_memory"/);
  assert.match(source, /createKnowledgeOnServer/);
  assert.match(source, /sourceRecordId: action\.id/);
});

test("no Knowledge write occurs before approval", async () => {
  const source = await read("src/lib/happy/actions/memoryProposal.server.ts");
  assert.doesNotMatch(source, /createKnowledgeOnServer|createKnowledgeWithClient/);
  assert.match(source, /status: "pending"/);
});

test("Home approval displays the proposed memory content", async () => {
  const repo = await read("src/lib/repositories/home/home.repository.ts");
  const view = await read("src/lib/happy/home/buildHomePrimaryHappyPresentation.ts");
  assert.match(repo, /select\("id,user_id,type,status,payload,created_at"\)/);
  assert.match(repo, /action\.payload[\s\S]*content/);
  assert.match(view, /block\.action\.summary \|\|/);
});

test("browser approval remains identity-only", async () => {
  const routes = await Promise.all([
    read("src/app/api/happy/actions/[id]/approve/route.ts"),
    read("src/app/api/happy/actions/[id]/reject/route.ts"),
  ]);
  for (const route of routes) {
    assert.match(route, /await request\.text\(\)/);
    assert.doesNotMatch(route, /request\.json|body\.personId|body\.eventId|body\.taskId|body\.userId/);
  }
});

test("proposals never create tasks, gifts, notifications, or decisions", async () => {
  const source = await read("src/lib/happy/actions/memoryProposal.server.ts");
  assert.doesNotMatch(source, /happy_tasks|happy_ideas|happy_notifications|createCanonicalGift|taskDecisions/);
});

test("there is no new migration or proposal table", async () => {
  const source = await read("src/lib/happy/actions/memoryProposal.server.ts");
  assert.match(source, /happy_actions/);
  assert.doesNotMatch(source, /create table|alter table/);
});

test("structured candidate has bounded content and rejects extra fields", async () => {
  const source = await read("src/lib/happy/actions/memoryProposal.server.ts");
  assert.match(source, /max\(2_000\)/);
  assert.match(source, /\.strict\(\)/);
});

test("no OpenAI/provider call is made by the proposal service", async () => {
  const source = await read("src/lib/happy/actions/memoryProposal.server.ts");
  assert.doesNotMatch(source, /from ["']openai["']|new OpenAI|happyAgentProvider|api\/happy\/agent/i);
});

test("proposal result is aggregate metadata, not personal content in logs or errors", async () => {
  const source = await read("src/lib/happy/actions/memoryProposal.server.ts");
  assert.doesNotMatch(source, /console\.|logOperational|throw new Error\([^)]*content/);
  assert.match(source, /actionId|personId/);
});

test("task-local decision text cannot be silently promoted to memory", async () => {
  const source = await read("src/lib/happy/actions/memoryProposal.server.ts");
  assert.match(source, /"task_local"/);
  assert.match(source, /not_general/);
});

test("same candidate can be approved through the existing terminal action lifecycle", async () => {
  const source = await read("src/lib/happy/actions/actionExecutor.server.ts");
  assert.match(source, /status: "completed"/);
  assert.match(source, /status === "completed"/);
  assert.match(source, /status !== "pending"/);
});

test("proposal layer does not broaden browser action ACL", async () => {
  const migration = await read("supabase/migrations/20260927100223_create_happy_actions.sql");
  assert.match(migration, /revoke all on table public\.happy_actions from public, anon, authenticated/);
  assert.match(migration, /grant select on table public\.happy_actions to authenticated/);
});
