import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("birthday recommendations are a narrow durable task artifact with owner-only reads", async () => {
  const migration = await read("supabase/migrations/20261012173353_birthday_task_gift_recommendations.sql");
  assert.match(migration, /create table public\.happy_task_gift_recommendations/);
  assert.match(migration, /unique \(task_id, slot\)/);
  assert.match(migration, /reason_sources jsonb/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /grant select, insert, update on table public\.happy_task_gift_recommendations to service_role/);
  assert.match(migration, /happy_task_gift_recommendations_select_own/);
  assert.match(migration, /one_active_selected_gift/);
});

test("generation persists only validated recommendation UI before entering choose_gift", async () => {
  const runner = await read("src/lib/happy/task-engine/continueBirthdayTask.server.ts");
  assert.match(runner, /createHappyAgentResponse/);
  assert.match(runner, /persistBirthdayRecommendation/);
  assert.match(runner, /happy_task_gift_recommendations/);
  assert.match(runner, /complete_birthday_gift_generation_v1/);
  assert.match(runner, /recommendationId/);
});

test("choice route accepts exactly recommendationId and server derives action payload", async () => {
  const route = await read("src/app/api/happy/tasks/[id]/gift-choice/route.ts");
  const service = await read("src/lib/happy/task-engine/selectBirthdayGiftRecommendation.server.ts");
  assert.match(route, /Object\.keys\(body\)\.length !== 1/);
  assert.match(route, /recommendationId/);
  assert.doesNotMatch(route, /personId|eventId|title|lifecycle|payload/);
  assert.match(service, /select_birthday_gift_recommendation_v1/);
  assert.match(service, /birthday-choice:/);
});

test("database selection and reconciliation keep executor generic and birthday workflow narrow", async () => {
  const migration = await read("supabase/migrations/20261012173353_birthday_task_gift_recommendations.sql");
  const executor = await read("src/lib/happy/actions/actionExecutor.server.ts");
  const approve = await read("src/app/api/happy/actions/[id]/approve/route.ts");
  const reject = await read("src/app/api/happy/actions/[id]/reject/route.ts");
  assert.match(migration, /select_birthday_gift_recommendation_v1/);
  assert.match(migration, /'save_gift'/);
  assert.match(migration, /'selected'/);
  assert.match(migration, /reconcile_birthday_save_gift_action_v1/);
  assert.match(approve, /reconcileBirthdaySaveGiftAction/);
  assert.match(reject, /reconcileBirthdaySaveGiftAction/);
  assert.doesNotMatch(executor, /happy_task_gift_recommendations|happy_task_decisions/);
});

