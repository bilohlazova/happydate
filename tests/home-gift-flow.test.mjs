import assert from "node:assert/strict";
import test from "node:test";
import { transitionGiftFlow } from "../src/components/home-dashboard/giftFlow.ts";
import { buildAssistantResponsePlan } from "../src/lib/assistant/responsePlan.ts";

const walk = (...steps) => steps.reduce(transitionGiftFlow, "status");

test("chosen gift saves or cancels without restarting status", () => {
  assert.equal(walk("save_prompt", "input", "saved"), "saved");
  assert.equal(walk("save_prompt", "done"), "done");
  assert.equal(walk("save_prompt", "input", "done"), "done");
});

test("recommendation branch declines or hands off", () => {
  assert.equal(walk("suggestion", "declined"), "declined");
  assert.equal(walk("suggestion", "assistant_handoff"), "assistant_handoff");
});

test("terminal states absorb every subsequent transition, including status", () => {
  for (const terminal of ["saved", "declined", "done", "assistant_handoff"]) {
    for (const next of ["status", "save_prompt", "input", "saved", "suggestion", "declined", "done", "assistant_handoff"]) {
      assert.equal(transitionGiftFlow(terminal, next), terminal);
    }
  }
  assert.equal(walk("input"), "status");
  assert.equal(walk("save_prompt", "suggestion"), "save_prompt");
});

test("verified gift context keeps budget-only replies in the gift conversation", () => {
  const request = { message: "500 грн", conversation: [], context: { giftContext: { personId: "mia", eventId: "birthday-mia" } } };
  const plan = buildAssistantResponsePlan(request);
  assert.match(plan, /VERIFIED GIFT HANDOFF/);
  assert.match(plan, /without asking for them again/);
  assert.match(plan, /budget first/);
  assert.match(plan, /2–3 clarifying questions/);
  assert.match(plan, /3–5 distinct gift ideas/);
});
