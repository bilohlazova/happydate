import assert from "node:assert/strict";
import test from "node:test";

const selectors = await import("../src/lib/happy/agent-context/happyAgentContext.selectors.ts");

test("HappyAgentContext pure selectors are bounded, deterministic, and keep stable splits", () => {
  const empty = selectors.emptyContext({ id: "user-a", locale: "uk", timezone: "UTC" });
  assert.equal(empty.user.id, "user-a");
  assert.deepEqual(empty.knowledge, { likes: [], dislikes: [], interests: [], importantFacts: [] });
  assert.deepEqual(empty.memories, []);
  assert.equal(selectors.daysUntil("2026-01-02", new Date("2026-01-01T23:59:00-11:00")), 0);
  const tasks = selectors.activeTasks(["active", "waiting_user", "paused", "completed", "cancelled", "failed"].map((status, i) => ({ id: String(i), type: "x", title: "x", status, personId: null, eventId: null, startedAt: "2026-01-01" })));
  assert.deepEqual(tasks.map((item) => item.status), ["active", "waiting_user", "paused"]);
  const split = selectors.gifts(["given", "idea", "selected", "purchased"].map((lifecycle, i) => ({ id:String(i), title:"x", lifecycle, eventId:null, createdAt:"2026-01-01" })));
  assert.deepEqual(split.previous.map((item) => item.lifecycle), ["given"]);
  assert.deepEqual(split.planned.map((item) => item.lifecycle), ["idea", "selected", "purchased"]);
  const actions = selectors.recentActions([{ id:"old",type:"x",status:"pending",taskId:null,stepId:null,executedAt:null,createdAt:"2026-01-01" },{ id:"new",type:"x",status:"pending",taskId:null,stepId:null,executedAt:null,createdAt:"2026-02-01" }]);
  assert.deepEqual(actions.map((item) => item.id), ["new", "old"]);
});
