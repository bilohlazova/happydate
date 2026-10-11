import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  normalizeTaskDecisionValue,
  projectActiveTaskDecisions,
} from "../src/lib/happy/taskDecisions.ts";
import { selectHappyAgentContextForIntent } from "../src/lib/happy/agent-context/selectHappyAgentContextForIntent.ts";

const task = "00000000-0000-4000-8000-000000000001";
const taskB = "00000000-0000-4000-8000-000000000002";

function context(taskDecisions) {
  return {
    user: { id: "user-a", locale: "en", timezone: "UTC" },
    person: { id: "person-a", name: "Mia", relationship: null, birthday: null, gender: null },
    event: { id: "event-a", type: "birthday", date: "2026-10-20", daysUntil: 10 },
    knowledge: { likes: [], dislikes: [{ id: "permanent", text: "rain", importance: 1, kind: "fact", category: null, polarity: "dislikes", occurredOn: null }], interests: [], importantFacts: [] },
    memories: [], gifts: { previous: [], planned: [] }, activeTasks: [], activeIdeas: [], recentActions: [],
    ...(taskDecisions ? { taskDecisions } : {}),
  };
}

test("task decision normalization is conservative and semantic dedupe preserves one useful display value", () => {
  assert.equal(normalizeTaskDecisionValue("  SPA\t"), "spa");
  assert.deepEqual(projectActiveTaskDecisions([
    { kind: "avoid_gift_theme", value: "SPA" },
    { kind: "avoid_gift_theme", value: " spa " },
  ]), { avoidGiftThemes: ["SPA"] });
});

test("only a task-scoped birthday projection carries its active constraint, without IDs or permanent-memory contamination", () => {
  const withDecision = selectHappyAgentContextForIntent(context({ avoidGiftThemes: ["SPA"] }), "birthday_gift");
  assert.equal(withDecision.kind, "ok");
  assert.deepEqual(withDecision.context.taskDecisions, { avoidGiftThemes: ["SPA"] });
  assert.deepEqual(withDecision.context.knowledge?.dislikes?.map((item) => item.text), ["rain"]);
  assert.doesNotMatch(JSON.stringify(withDecision.context.taskDecisions), /task_id|user_id|person_id|event_id|created_at|updated_at/i);

  const taskBContext = selectHappyAgentContextForIntent(context(undefined), "birthday_gift");
  assert.equal(taskBContext.kind, "ok");
  assert.equal(taskBContext.context.taskDecisions, undefined, "a later task starts clean");
  assert.notEqual(task, taskB);

  const greeting = selectHappyAgentContextForIntent(context({ avoidGiftThemes: ["SPA"] }), "write_greeting");
  assert.equal(greeting.kind, "ok");
  assert.equal(greeting.context.taskDecisions, undefined, "gift-only constraint is not sent to greeting generation");
});

test("migration makes decisions task-rooted, DB-deduped, owner-safe, and browser read-only", async () => {
  const sql = await readFile("supabase/migrations/20261009171100_create_happy_task_decisions.sql", "utf8");
  assert.match(sql, /create table public\.happy_task_decisions/i);
  assert.match(sql, /task_id uuid not null references public\.happy_tasks/i);
  assert.doesNotMatch(sql, /person_id uuid|event_id uuid/);
  assert.match(sql, /kind in \('avoid_gift_theme'\)/i);
  assert.match(sql, /status in \('active', 'revoked'\)/i);
  assert.match(sql, /unique \(user_id, task_id, kind, normalized_value\)/i);
  assert.match(sql, /security definer[\s\S]*set search_path = ''/i);
  assert.match(sql, /task\.id = new\.task_id[\s\S]*task\.user_id = new\.user_id/i);
  assert.match(sql, /revoke all on table public\.happy_task_decisions from public, anon, authenticated/i);
  assert.match(sql, /grant select on table public\.happy_task_decisions to authenticated/i);
  assert.doesNotMatch(sql, /grant (?:all|insert|update|delete)[^\n]* to authenticated/i);
  assert.match(sql, /happy_task_decisions_select_own/i);
});

test("narrow server boundary derives authority from verified user/task and never stores decisions as actions or Person Knowledge", async () => {
  const [repository, route, contextBuilder, assistantContext] = await Promise.all([
    readFile("src/lib/happy/taskDecisions.server.ts", "utf8"),
    readFile("src/app/api/happy/tasks/[id]/decisions/route.ts", "utf8"),
    readFile("src/lib/happy/agent-context/buildHappyAgentContext.server.ts", "utf8"),
    readFile("src/lib/assistant/verifiedAssistantContext.server.ts", "utf8"),
  ]);
  assert.match(repository, /\.eq\("id", taskId\)[\s\S]*\.eq\("user_id", userId\)/);
  assert.match(repository, /onConflict: "user_id,task_id,kind,normalized_value"/);
  assert.match(repository, /status: "revoked"/);
  assert.doesNotMatch(repository, /happy_actions|memories|knowledgeRepository|person_id|event_id/);
  assert.match(route, /z\.object\(\{[\s\S]*kind: z\.literal\("avoid_gift_theme"\)[\s\S]*value:/);
  assert.doesNotMatch(route, /userId:\s*z\.|personId:\s*z\.|eventId:\s*z\.|regex|match\(/i);
  assert.match(contextBuilder, /getActiveTaskDecisions\(client, \{ userId, taskId \}\)/);
  assert.match(assistantContext, /scope\.type === "task" \? \{ type: scope\.taskType, avoidGiftThemes:/);
});

test("free-text chat has no task-decision extraction or auto-persistence path", async () => {
  const [chatRoute, modal] = await Promise.all([
    readFile("src/app/api/ai-chat/route.ts", "utf8"),
    readFile("src/components/ChatAssistantModal.tsx", "utf8"),
  ]);
  assert.doesNotMatch(`${chatRoute}\n${modal}`, /addTaskDecision|revokeTaskDecision|\.from\("happy_task_decisions"\)\.(?:insert|update|upsert)|\bSPA\b/i);
});
