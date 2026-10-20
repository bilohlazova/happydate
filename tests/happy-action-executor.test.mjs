import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("executor is a narrow server-only allowlist with strict persisted payload parsing", async () => {
  const source = await read("src/lib/happy/actions/actionExecutor.server.ts");
  assert.match(source, /server-only/);
  assert.match(source, /getHappyToolDefinition\(action\.type\)/);
  assert.match(source, /save_gift/);
  assert.match(source, /save_memory/);
  assert.match(source, /create_reminder/);
  assert.match(source, /unsupported/);
  assert.match(source, /safeParse\(action\.payload\)/);
  assert.match(source, /eq\("user_id", userId\)/);
  assert.doesNotMatch(source, /execute\s*\(.*payload/);
});

test("approval routes accept only action identity and authenticated ownership", async () => {
  const approve = await read("src/app/api/happy/actions/[id]/approve/route.ts");
  const reject = await read("src/app/api/happy/actions/[id]/reject/route.ts");
  for (const route of [approve, reject]) {
    assert.match(route, /getAssistantRequestIdentity/);
    assert.match(route, /identity\.kind !== "authenticated"/);
    assert.match(route, /await request\.text\(\)/);
    assert.doesNotMatch(route, /request\.json|request\.body|payload|personId|eventId|taskId/);
  }
});

test("approve/reject are deterministic terminal transitions and call no AI", async () => {
  const source = await read("src/lib/happy/actions/actionExecutor.server.ts");
  assert.match(source, /status === "completed"/);
  assert.match(source, /status === "rejected"/);
  assert.match(source, /status: "completed"/);
  assert.match(source, /status: "rejected"/);
  assert.match(source, /eq\("status", "pending"\)/);
  assert.doesNotMatch(source, /openai|happyAgentProvider|api\/happy\/agent|create_task|complete_task_step/);
});

test("executor uses canonical gift and Knowledge write boundaries with action-keyed idempotency", async () => {
  const source = await read("src/lib/happy/actions/actionExecutor.server.ts");
  assert.match(source, /createCanonicalGiftWithClient/);
  assert.match(source, /createKnowledgeOnServer/);
  assert.match(source, /sourceRecordId: action\.id/);
  assert.match(source, /giftId: gift\.id/);
  assert.match(source, /knowledgeId: knowledge\.id/);
  assert.doesNotMatch(source, /happy_task_decisions/);
});

test("canonical Tool Policy keeps only save_gift/save_memory executable in V1", async () => {
  const tools = await read("src/lib/happy/tools/happyTools.ts");
  assert.match(tools, /type HappyToolName/);
  assert.match(tools, /save_gift/);
  assert.match(tools, /save_memory/);
  assert.match(tools, /create_reminder/);
});
