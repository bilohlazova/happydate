import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { orchestrateThreeBrains } from "../src/lib/orchestration/threeBrainOrchestrator.ts";

test("three brains run in order and conversation receives only bounded projections", () => {
  const calls = [];
  const raw = { secretRepositoryRow: "must stay in Memory", confirmed: "tea" };
  const result = orchestrateThreeBrains(raw, {
    memoryBrain(input) {
      calls.push("memory");
      assert.equal(input.secretRepositoryRow, "must stay in Memory");
      return {
        memory: { preference: input.confirmed },
        sources: [
          { id: "k1", kind: "knowledge" },
          { id: "k1", kind: "knowledge" },
        ],
      };
    },
    careBrain(input) {
      calls.push("care");
      assert.deepEqual(input.memory, { preference: "tea" });
      assert.equal("secretRepositoryRow" in input, false);
      return {
        care: { priority: "prepare_gift" },
        reasonCodes: ["birthday_in_five_days"],
        sources: [...input.sources, { id: "e1", kind: "event" }],
      };
    },
    conversationBrain(input) {
      calls.push("conversation");
      assert.equal("secretRepositoryRow" in input, false);
      assert.deepEqual(input.sources, [
        { id: "k1", kind: "knowledge" },
        { id: "e1", kind: "event" },
      ]);
      return {
        conversation: { messageKey: "gift.prepare" },
        proposedActions: [{
          type: "open_gift_assistant",
          requiresConfirmation: true,
          payload: { personId: "p1" },
        }],
      };
    },
  });

  assert.deepEqual(calls, ["memory", "care", "conversation"]);
  assert.deepEqual(result.trace, {
    memorySourceCount: 1,
    careSourceCount: 2,
    careReasonCodes: ["birthday_in_five_days"],
    proposedActionTypes: ["open_gift_assistant"],
  });
  assert.equal(result.proposedActions[0].requiresConfirmation, true);
});

test("orchestrator stays pure and cannot reach repositories or presentation", async () => {
  const source = await readFile(
    new URL("../src/lib/orchestration/threeBrainOrchestrator.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /supabase|repositories\//i);
  assert.doesNotMatch(source, /components\/|src\/app\//i);
  assert.doesNotMatch(source, /fetch\(|\.insert\(|\.update\(|\.delete\(/i);
});
