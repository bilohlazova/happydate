import assert from "node:assert/strict";
import test from "node:test";
const tools = await import("../src/lib/happy/tools/happyTools.ts");
const id = "00000000-0000-4000-8000-000000000001";

test("Happy tool policy has the fixed three-level matrix and derived approval", () => {
  for (const name of ["get_person_context", "get_event_context", "get_previous_gifts"]) assert.equal(tools.getHappyToolLevel(name), "read");
  for (const name of ["create_task", "complete_task_step", "propose_action"]) assert.equal(tools.getHappyToolLevel(name), "safe_internal_write");
  for (const name of ["save_gift", "save_memory", "create_reminder"]) assert.equal(tools.getHappyToolLevel(name), "user_data_action");
  assert.equal(tools.happyToolRequiresApproval("get_person_context"), false);
  assert.equal(tools.happyToolRequiresApproval("create_task"), false);
  assert.equal(tools.happyToolRequiresApproval("save_gift"), true);
  assert.equal(tools.happyToolRequiresApproval("unknown"), null);
});

test("Happy tool evaluator is strict, fail-closed and never grants level three execution", () => {
  assert.deepEqual(tools.evaluateHappyToolCall({ toolName: "unknown", input: {} }), { kind: "invalid_tool_call" });
  for (const input of [{ personId: "bad" }, { personId: id, userId: id }, { personId: id, requiresApproval: false }, { personId: id, level: "read" }, {}, { personId: id, payload: {} }]) assert.deepEqual(tools.evaluateHappyToolCall({ toolName: "get_person_context", input }), { kind: "invalid_tool_call" });
  const gift = tools.evaluateHappyToolCall({ toolName: "save_gift", input: { personId: id, title: "Gift" } });
  assert.equal(gift.kind, "approval_required"); assert.equal(gift.requiresApproval, true);
  const memory = tools.evaluateHappyToolCall({ toolName: "save_memory", input: { personId: id, content: "Memory" } });
  assert.equal(memory.kind, "approval_required");
  const reminder = tools.evaluateHappyToolCall({ toolName: "create_reminder", input: { eventId: id, occurrenceDate: "2026-12-01", actionKind: "prepare" } });
  assert.equal(reminder.kind, "approval_required");
});

test("propose_action is level two but its nested proposal remains exact and unapproved", () => {
  const valid = tools.evaluateHappyToolCall({ toolName: "propose_action", input: { type: "save_gift", input: { personId: id, title: "Gift" } } });
  assert.equal(valid.kind, "execute_allowed"); assert.equal(valid.level, "safe_internal_write"); assert.equal(valid.requiresApproval, false);
  for (const input of [{ type: "save_gift", input: { personId: id, title: "Gift", blob: {} } }, { type: "unknown", input: {} }, { type: "save_gift", input: { personId: "bad", title: "Gift" } }]) assert.deepEqual(tools.evaluateHappyToolCall({ toolName: "propose_action", input }), { kind: "invalid_tool_call" });
});
