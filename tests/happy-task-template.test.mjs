import assert from "node:assert/strict";
import test from "node:test";
const { getHappyTaskTemplate } = await import("../src/lib/happy/task-engine/happyTaskTemplate.ts");
test("birthday preparation template is immutable, versioned and canonical", () => {
  const template = getHappyTaskTemplate("birthday_preparation");
  assert.equal(template?.version, 1); assert.deepEqual(template?.steps.map((step) => step.type), ["analyze_context", "analyze_gifts", "generate_gift_ideas", "choose_gift", "save_gift", "prepare_greeting"]);
  assert.equal(template?.steps[3].waitsForUser, true); assert.equal(template?.steps[4].requiresApproval, true); assert.equal(template?.steps[5].optional, true);
  assert.equal(getHappyTaskTemplate("unknown"), null); assert(Object.isFrozen(template)); assert(Object.isFrozen(template?.steps));
});
