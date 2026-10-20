import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Home approval UI invokes only the authoritative action routes and sends no replacement payload", async () => {
  const client = await read("src/components/HomePageClient.tsx");
  const card = await read("src/components/happy/HomePrimaryHappyBlock.tsx");
  const dashboard = await read("src/components/home-dashboard/HomeDashboard.tsx");
  assert.match(client, /\/api\/happy\/actions\/\$\{encodeURIComponent\(actionId\)\}\/\$\{response\}/);
  assert.match(client, /\{ method: "POST" \}/);
  assert.doesNotMatch(client.slice(client.indexOf("const respondHappyAction"), client.indexOf("const continueHappyTask")), /body:|payload|userId|personId|eventId|taskId/);
  assert.match(card, /onRespondAction\(block\.action\.id, response\)/);
  assert.match(card, /if \(block\.type !== "approval" \|\| busy\) return/);
  assert.match(card, /disabled=\{busy !== null\}/);
  assert.match(dashboard, /onRespondHappyAction/);
});

test("Home reloads authoritative state after success and treats a 409 as stale rather than optimistic success", async () => {
  const client = await read("src/components/HomePageClient.tsx");
  const actionHandler = client.slice(client.indexOf("const respondHappyAction"), client.indexOf("const continueHappyTask"));
  assert.match(actionHandler, /if \(result\.status === 409\)/);
  assert.match(actionHandler, /reload\(\);/);
  assert.match(actionHandler, /throw new Error/);
  assert.match(actionHandler, /if \(!result\.ok\) throw/);
  assert.doesNotMatch(actionHandler, /setViewModel|status:\s*["']completed/);
});

test("only currently executable V1 action types receive approval controls", async () => {
  const adapter = await read("src/lib/happy/home/buildHomePrimaryHappyPresentation.ts");
  assert.match(adapter, /block\.action\.type === "save_gift" \|\| block\.action\.type === "save_memory"/);
  assert.match(adapter, /\? \{ kind: "approve_action"/);
  assert.match(adapter, /: null/);
});

test("approval component itself has no provider, database, Task Runner, or executor path", async () => {
  const sources = await Promise.all([
    read("src/components/happy/HomePrimaryHappyBlock.tsx"),
    read("src/lib/happy/home/buildHomePrimaryHappyPresentation.ts"),
  ]);
  assert.doesNotMatch(sources.join("\n"), /openai|provider|service_role|supabase|complete_task_step|Task Runner/i);
});
