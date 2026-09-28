import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);
const taskMigration = await readFile(new URL("supabase/migrations/20260927093537_create_happy_tasks.sql", root), "utf8");
const integrityMigration = await readFile(new URL("supabase/migrations/20260928163431_add_happy_task_event_person_integrity.sql", root), "utf8");
const birthdayMigration = await readFile(new URL("supabase/migrations/20260927175124_create_birthday_preparation_task_rpc.sql", root), "utf8");
const stepsMigration = await readFile(new URL("supabase/migrations/20260927094751_create_happy_task_steps.sql", root), "utf8");
const eventTasks = await readFile(new URL("src/lib/happy/task-engine/happyEventTasks.server.ts", root), "utf8");
const context = await readFile(new URL("src/lib/happy/agent-context/buildHappyAgentContext.server.ts", root), "utf8");

test("Event is the durable task context without introducing a goals hierarchy", () => {
  assert.match(taskMigration, /event_id uuid\s+references public\.events\(id\)\s+on delete cascade/i);
  assert.match(taskMigration, /event_id uuid/i);
  assert.doesNotMatch(taskMigration, /event_id uuid not null/i);
  assert.doesNotMatch(`${taskMigration}\n${integrityMigration}`, /happy_goals|goal_id|create table .*goals/i);
  assert.match(birthdayMigration, /e\.person_id=p_person_id and e\.category='birthday'/);
});

test("task owner and event person context are enforced for RLS and privileged writers", () => {
  assert.match(integrityMigration, /security definer\s+set search_path = ''/i);
  assert.match(integrityMigration, /event\.user_id = new\.user_id/);
  assert.match(integrityMigration, /person\.user_id = new\.user_id/);
  assert.match(integrityMigration, /new\.person_id is distinct from v_event_person_id/);
  assert.match(integrityMigration, /happy_tasks_validate_event_person_consistency/);
  assert.match(integrityMigration, /revoke all on function public\.validate_happy_task_event_person_consistency\(\)\s+from public, anon, authenticated/i);
});

test("birthday active uniqueness is task-type-specific and steps remain task-owned", () => {
  assert.match(birthdayMigration, /on public\.happy_tasks \(user_id, type, person_id, event_id\)\s+where type = 'birthday_preparation'/i);
  assert.doesNotMatch(birthdayMigration, /unique index [^(]+\(user_id, event_id\)/i);
  assert.match(stepsMigration, /task_id uuid not null\s+references public\.happy_tasks\(id\)\s+on delete cascade/i);
  assert.doesNotMatch(stepsMigration, /^\s*event_id\b/im);
});

test("event-scoped task selector is bounded, ordered, owner-scoped, and used by event context", () => {
  assert.match(eventTasks, /import "server-only"/);
  assert.match(eventTasks, /select\("id,type,title,status,person_id,event_id,started_at"\)/);
  assert.doesNotMatch(eventTasks, /select\("\*"\)/);
  assert.match(eventTasks, /\.eq\("user_id", userId\)\s+\.eq\("event_id", eventId\)/);
  assert.match(eventTasks, /\.order\("started_at", \{ ascending: false \}\)\s+\.limit\(10\)/);
  assert.match(context, /eventId \? getHappyTasksForEvent\(client, userId, eventId\)/);
});
