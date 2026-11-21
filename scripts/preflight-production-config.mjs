import {
  getAssistantEnvironmentStatus,
  getMissingAssistantConfiguration,
} from "../src/lib/assistant/chatEnvironment.ts";

const status = getAssistantEnvironmentStatus();
const learningConfigured = Boolean(process.env.HAPPY_LEARNING_TOKEN_SECRET?.trim());
const missing = [
  ...getMissingAssistantConfiguration(),
  ...(!learningConfigured ? ["happy_learning_token_secret_missing"] : []),
];

if (!status.productionReady || !learningConfigured) {
  process.stderr.write("Production AI configuration preflight: FAIL\n");
  process.stderr.write(`Missing configuration categories: ${missing.join(", ")}\n`);
  process.stderr.write("Secret values are not inspected or printed.\n");
  process.exitCode = 1;
} else {
  process.stdout.write("Production AI configuration preflight: PASS\n");
  process.stdout.write(
    "Required configuration categories are present and the daily budget is within bounds.\n",
  );
  process.stdout.write(
    "This checks configuration only; it does not call OpenAI or Redis.\n",
  );
}
