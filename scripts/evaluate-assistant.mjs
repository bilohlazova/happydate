import { readFile } from "node:fs/promises";
import OpenAI from "openai";
import { ASSISTANT_CHAT_CONFIG } from "../src/lib/assistant/chatConfig.ts";
import { ASSISTANT_BEHAVIOR_MANIFEST } from "../src/lib/assistant/assistantBehaviorManifest.ts";
import {
  buildAssistantSystemPrompt,
  formatAssistantContext,
  formatAssistantGiftOutcomeContext,
} from "../src/lib/assistant/chatContract.ts";
import {
  evaluateAssistantResponse,
  missingRequiredAssistantEvaluationScenarios,
  parseAssistantEvaluationScenario,
} from "../src/lib/assistant/assistantEvaluation.ts";

const dataset = JSON.parse(await readFile(new URL("../evals/assistant-conversation.json", import.meta.url), "utf8"));
if (dataset.schemaVersion !== 1 || !Array.isArray(dataset.scenarios)) throw new Error("Invalid evaluation dataset");
if (dataset.targetBehaviorVersion !== ASSISTANT_BEHAVIOR_MANIFEST.behaviorVersion) {
  throw new Error("Evaluation dataset does not target the active Assistant behavior");
}
const scenarios = dataset.scenarios.map(parseAssistantEvaluationScenario);
if (scenarios.some((scenario) => !scenario)) throw new Error("Invalid evaluation scenario");
const ids = scenarios.map(({ id }) => id);
if (new Set(ids).size !== ids.length) throw new Error("Duplicate evaluation scenario id");
const missingRequiredScenarios = missingRequiredAssistantEvaluationScenarios(scenarios);
if (missingRequiredScenarios.length) {
  throw new Error(`Evaluation dataset is missing required scenarios: ${missingRequiredScenarios.join(", ")}`);
}

if (process.env.RUN_LIVE_ASSISTANT_EVALS !== "1") {
  process.stdout.write(`Assistant evaluation dataset valid: ${scenarios.length} scenarios. Behavior: ${ASSISTANT_BEHAVIOR_MANIFEST.behaviorVersion}. Live run skipped.\n`);
  process.exit(0);
}

const apiKey = process.env.OPENAI_API_KEY?.trim();
if (!apiKey) throw new Error("OPENAI_API_KEY is required for live evaluations");
const openai = new OpenAI({ apiKey });
process.stdout.write(`Evaluating ${ASSISTANT_BEHAVIOR_MANIFEST.behaviorVersion} with ${ASSISTANT_BEHAVIOR_MANIFEST.model}.\n`);
let failed = 0;
for (const scenario of scenarios) {
  const context = formatAssistantContext({
    ...scenario.request.context,
    currentDate: scenario.serverCurrentDate ?? null,
  });
  const outcomes = formatAssistantGiftOutcomeContext(scenario.serverGiftOutcomes ?? []);
  const completion = await openai.chat.completions.create({
    model: ASSISTANT_CHAT_CONFIG.model,
    temperature: ASSISTANT_CHAT_CONFIG.temperature,
    max_completion_tokens: ASSISTANT_CHAT_CONFIG.maxOutputTokens,
    messages: [
      { role: "system", content: buildAssistantSystemPrompt(scenario.request.locale) },
      ...(context ? [{ role: "system", content: context }] : []),
      ...(outcomes ? [{ role: "system", content: outcomes }] : []),
      ...scenario.request.conversation,
      { role: "user", content: scenario.request.message },
    ],
  });
  const response = completion.choices[0]?.message?.content ?? "";
  const failures = evaluateAssistantResponse(scenario, response);
  if (failures.length) failed += 1;
  process.stdout.write(`${scenario.id}: ${failures.length ? `FAIL ${failures.map(({ code }) => code).join(",")}` : "PASS"}\n`);
}
if (failed) throw new Error(`${failed} assistant evaluation scenario(s) failed`);
