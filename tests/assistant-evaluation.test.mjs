import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  evaluateAssistantResponse,
  missingRequiredAssistantEvaluationScenarios,
  parseAssistantEvaluationScenario,
} from "../src/lib/assistant/assistantEvaluation.ts";
import { ASSISTANT_BEHAVIOR_MANIFEST } from "../src/lib/assistant/assistantBehaviorManifest.ts";
import { ASSISTANT_CHAT_CONFIG } from "../src/lib/assistant/chatConfig.ts";
import { buildAssistantSystemPrompt } from "../src/lib/assistant/chatContract.ts";

const DATASET_URL = new URL("../evals/assistant-conversation.json", import.meta.url);

test("assistant evaluation dataset is versioned, unique and covers every product locale", async () => {
  const dataset = JSON.parse(await readFile(DATASET_URL, "utf8"));
  assert.equal(dataset.schemaVersion, 1);
  assert.equal(dataset.targetBehaviorVersion, ASSISTANT_BEHAVIOR_MANIFEST.behaviorVersion);
  const scenarios = dataset.scenarios.map(parseAssistantEvaluationScenario);
  assert.ok(scenarios.length >= 14);
  assert.ok(scenarios.every(Boolean));
  assert.equal(new Set(scenarios.map(({ id }) => id)).size, scenarios.length);
  assert.deepEqual(
    [...new Set(scenarios.map(({ request }) => request.locale))].sort(),
    ["de", "en", "pl", "ru", "uk"],
  );
  assert.ok(scenarios.every(({ criteria }) => criteria.maxQuestions <= 1));
  assert.deepEqual(missingRequiredAssistantEvaluationScenarios(scenarios), []);
});

test("release evaluation coverage cannot silently drop core relationship-care behaviors", async () => {
  const dataset = JSON.parse(await readFile(DATASET_URL, "utf8"));
  const scenarios = dataset.scenarios.map(parseAssistantEvaluationScenario).filter(Boolean);
  const withoutOutcomeLearning = scenarios.filter(({ id }) => id !== "conflicted-outcome-is-not-generalized");
  assert.deepEqual(missingRequiredAssistantEvaluationScenarios(withoutOutcomeLearning), [
    "conflicted-outcome-is-not-generalized",
  ]);
});

test("behavior manifest fingerprints the actual prompt and model configuration", () => {
  const fingerprint = `sha256:${createHash("sha256").update(buildAssistantSystemPrompt("en")).digest("hex")}`;
  assert.equal(ASSISTANT_BEHAVIOR_MANIFEST.promptFingerprint, fingerprint);
  assert.equal(ASSISTANT_BEHAVIOR_MANIFEST.model, ASSISTANT_CHAT_CONFIG.model);
  assert.equal(ASSISTANT_BEHAVIOR_MANIFEST.temperature, ASSISTANT_CHAT_CONFIG.temperature);
  assert.equal(ASSISTANT_BEHAVIOR_MANIFEST.maxOutputTokens, ASSISTANT_CHAT_CONFIG.maxOutputTokens);
  assert.match(ASSISTANT_BEHAVIOR_MANIFEST.behaviorVersion, /^assistant-\d{4}-\d{2}-\d{2}\.\d+$/);
  assert.equal(Object.isFrozen(ASSISTANT_BEHAVIOR_MANIFEST), true);
});

test("response evaluator reports evidence, invention, length and question failures without response text", () => {
  const scenario = parseAssistantEvaluationScenario({
    id: "evaluator-contract",
    description: "Synthetic evaluator contract.",
    request: {
      message: "Help", locale: "en", conversation: [],
      context: { userName: null, insight: null, events: [], people: [], memories: [], activePersonId: null, personResolutionStatus: "none" },
    },
    criteria: {
      maxQuestions: 1,
      maxCharacters: 40,
      mustContainAny: [["known fact"]],
      mustNotContain: ["invented flower"],
    },
  });
  assert.ok(scenario);
  const failures = evaluateAssistantResponse(
    scenario,
    "Invented flower. Is this right? Or that? This response is deliberately long.",
  );
  assert.deepEqual(failures.map(({ code }) => code), [
    "too_many_questions",
    "too_long",
    "missing_required_evidence",
    "forbidden_claim",
  ]);
  assert.doesNotMatch(JSON.stringify(failures), /This response|Invented flower\. Is/);
});

test("live evaluator is explicit opt-in and prints no model response content", async () => {
  const script = await readFile(new URL("../scripts/evaluate-assistant.mjs", import.meta.url), "utf8");
  assert.match(script, /RUN_LIVE_ASSISTANT_EVALS !== "1"/);
  assert.match(script, /OPENAI_API_KEY is required/);
  assert.doesNotMatch(script, /process\.stdout\.write\([^\n]*response/);
  assert.match(script, /failures\.map\(\(\{ code \}\) => code\)/);
});
