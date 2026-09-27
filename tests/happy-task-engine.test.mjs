import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);
const migration = await readFile(new URL("supabase/migrations/20260927175124_create_birthday_preparation_task_rpc.sql", root), "utf8");
const service = await readFile(new URL("src/lib/happy/task-engine/happyTaskEngine.server.ts", root), "utf8");
const { getHappyTaskTemplate } = await import("../src/lib/happy/task-engine/happyTaskTemplate.ts");

test("birthday preparation RPC durably creates exactly the canonical V1 plan", () => {
  const template = getHappyTaskTemplate("birthday_preparation");
  assert.ok(template);
  assert.equal(template.version, 1);
  assert.equal(template.steps.length, 6);
  for (const step of template.steps) {
    assert.match(migration, new RegExp(`\\(v_task_id,${step.position},'${step.type}','${step.title}',${step.requiresApproval}\\)`));
  }
  assert.match(migration, /'\{"templateVersion":1\}'::jsonb/);
  assert.equal(template.steps.filter((step) => step.requiresApproval).map((step) => step.type).join(","), "save_gift");
  assert.equal(template.steps.find((step) => step.type === "choose_gift")?.waitsForUser, true);
  assert.equal(template.steps.find((step) => step.type === "prepare_greeting")?.optional, true);
});

test("Task Engine service is server-only, RPC-only, and accepts backend-owned input", async () => {
  assert.match(service, /import "server-only"/);
  assert.match(service, /\.rpc\("create_birthday_preparation_task_v1"/);
  assert.doesNotMatch(service, /\.from\("happy_tasks"\)\.(insert|update|delete)/);
  assert.doesNotMatch(service, /\.from\("happy_task_steps"\)\.(insert|update|delete)/);
  for (const forbidden of ["title:", "status:", "source:", "steps:", "positions:", "templateVersion:", "context_snapshot:", "timestamps:"]) {
    assert.doesNotMatch(service.match(/export type CreateHappyTaskInput[\s\S]*?};/)?.[0] ?? "", new RegExp(forbidden));
  }
  assert.match(service, /if \(!template\) return \{ kind: "unsupported_task_type" \}/);
});

test("RPC is security-definer, service-role-only, and scopes active uniqueness", () => {
  assert.match(migration, /security definer set search_path = ''/i);
  assert.match(migration, /revoke all on function public\.create_birthday_preparation_task_v1\(uuid,uuid,uuid\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.create_birthday_preparation_task_v1\(uuid,uuid,uuid\) to service_role/i);
  assert.match(migration, /where type = 'birthday_preparation' and status in \('active', 'waiting_user', 'paused'\)/i);
  assert.match(migration, /returns table\(task_id uuid, reused boolean, task_status text, context_snapshot jsonb, durable_steps jsonb\)/i);
});
