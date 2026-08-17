import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("every active private JSON API has an explicit byte limit", async () => {
  const files = [
    "src/app/api/ai-chat/route.ts",
    "src/app/api/ai/gift-suggestions/route.ts",
    "src/app/api/account/delete/route.ts",
    "src/lib/happy-learning/happyLearningDetectV2.server.ts",
    "src/lib/happy-learning/happyLearningConfirmV2.server.ts",
  ];
  for (const file of files) {
    assert.match(await source(file), /readBoundedJson\(/, file);
  }
});

test("Gift AI fails closed around identity, rate limits, concurrency and provider time", async () => {
  const route = await source("src/app/api/ai/gift-suggestions/route.ts");
  const ownership = route.indexOf("resolveGiftAccess(");
  const limiter = route.indexOf("limiter.check(");
  const provider = route.indexOf("generateGiftRecommendations(", limiter);
  assert.ok(ownership > 0 && limiter > ownership && provider > limiter);
  assert.match(route, /createConfiguredAssistantRateLimiter/);
  assert.match(route, /createConfiguredAiBudget/);
  assert.match(route, /budget\.reserve/);
  assert.match(route, /daily_ai_budget_exceeded/);
  assert.match(route, /max_output_tokens: GIFT_AI_MAX_OUTPUT_TOKENS/);
  assert.match(route, /ai\.usage\.input_tokens/);
  assert.match(route, /limiter\.acquire/);
  assert.match(route, /AbortSignal\.timeout\(GIFT_AI_TIMEOUT_MS\)/);
  assert.match(route, /Retry-After/);
  assert.match(route, /Cache-Control.*no-store/);
  assert.doesNotMatch(route, /error instanceof Error\s*\?\s*error\.message/);
  assert.doesNotMatch(route, /AI ROUTE ERROR/);
});

test("retired privileged services contain no secret-bearing implementation", async () => {
  const retired = `${await source("src/app/api/replicate/webhook/route.ts")}\n${await source("src/app/api/auto-release/route.ts")}`;
  assert.match(retired, /status: 410/);
  assert.doesNotMatch(retired, /SUPABASE_SERVICE_ROLE_KEY|CRON_SECRET|request\.json|createClient|\.update\(/);
});
