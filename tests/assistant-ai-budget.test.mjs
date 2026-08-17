import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  AI_COST_POLICY,
  MemoryAiBudget,
  UpstashAiBudget,
  costUnits,
  createConfiguredAiBudget,
  estimateInputTokens,
  estimatedUsd,
  parseDailyAiBudgetUsd,
} from "../src/lib/assistant/aiBudget.ts";
import { createAssistantChatResponse } from "../src/lib/assistant/chatServer.ts";

const request = {
  message: "Help me",
  locale: "en",
  conversation: [],
  context: { userName: null, insight: null, events: [], people: [], memories: [] },
};

test("pricing policy and token estimate are deterministic and conservative", () => {
  assert.equal(AI_COST_POLICY.inputUsdPerMillion, 0.4);
  assert.equal(AI_COST_POLICY.outputUsdPerMillion, 1.6);
  assert.equal(costUnits({ inputTokens: 100, outputTokens: 25 }), 200);
  assert.equal(estimatedUsd({ inputTokens: 1_000_000, outputTokens: 1_000_000 }), 2);
  assert.ok(estimateInputTokens([{ content: "abcd" }]) > 1);
  assert.equal(parseDailyAiBudgetUsd("0.1"), 0.1);
  assert.equal(parseDailyAiBudgetUsd("1000"), 1000);
  for (const invalid of [undefined, "", "0", "0.01", "1001", "private"]) {
    assert.equal(parseDailyAiBudgetUsd(invalid), null);
  }
});

test("memory budget reserves worst case, settles actual usage once and resets by UTC day", async () => {
  let now = new Date("2026-08-16T12:00:00.000Z");
  const budget = new MemoryAiBudget(0.1, () => now);
  const first = await budget.reserve(100_000, 10_000);
  assert.equal(first.allowed, true);
  if (!first.allowed) return;
  await first.reservation.settle({ inputTokens: 10_000, outputTokens: 0 });
  await first.reservation.settle({ inputTokens: 200_000, outputTokens: 0 });
  const second = await budget.reserve(100_000, 10_000);
  assert.equal(second.allowed, true);
  const blocked = await budget.reserve(100_000, 10_000);
  assert.equal(blocked.allowed, false);
  now = new Date("2026-08-17T00:00:01.000Z");
  assert.equal((await budget.reserve(100_000, 10_000)).allowed, true);
});

test("production budget fails closed without valid money cap and development uses memory", () => {
  assert.equal(createConfiguredAiBudget({}, "production"), null);
  assert.equal(createConfiguredAiBudget({ OPENAI_DAILY_BUDGET_USD: "invalid" }, "production"), null);
  assert.ok(createConfiguredAiBudget({}, "development") instanceof MemoryAiBudget);
  assert.ok(createConfiguredAiBudget({
    OPENAI_DAILY_BUDGET_USD: "2",
    UPSTASH_REDIS_REST_URL: "https://example.invalid",
    UPSTASH_REDIS_REST_TOKEN: "token",
  }, "production") instanceof UpstashAiBudget);
});

test("budget denial happens before provider and returns the UTC retry boundary", async () => {
  let providerCalled = false;
  const response = await createAssistantChatResponse(request, async () => {
    providerCalled = true;
    return (async function* () {})();
  }, {
    budget: { async reserve() { return { allowed: false, retryAfterSeconds: 1234 }; } },
  });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "1234");
  assert.deepEqual(await response.json(), { error: "daily_ai_budget_exceeded", retryAfter: 1234 });
  assert.equal(providerCalled, false);
});

test("measured provider usage settles the reservation without exposing content", async () => {
  let estimate;
  let settled;
  const originalInfo = console.info;
  const logs = [];
  console.info = (value) => logs.push(String(value));
  try {
    const response = await createAssistantChatResponse(request, async () => ({
      stream: (async function* () { yield "safe reply"; })(),
      usage: Promise.resolve({ inputTokens: 321, outputTokens: 45 }),
    }), {
      budget: {
        async reserve(inputTokens, maxOutputTokens) {
          estimate = { inputTokens, maxOutputTokens };
          return {
            allowed: true,
            reservation: {
              reservedCostUnits: 1,
              async settle(usage) { settled = usage; },
            },
          };
        },
      },
    });
    assert.equal(await response.text(), "safe reply");
  } finally {
    console.info = originalInfo;
  }
  assert.ok(estimate.inputTokens > 0);
  assert.equal(estimate.maxOutputTokens, 700);
  assert.deepEqual(settled, { inputTokens: 321, outputTokens: 45 });
  assert.equal(logs.length, 1);
  assert.doesNotMatch(logs[0], /safe reply|Help me/);
  assert.match(logs[0], /"scope":"ai-cost"/);
});

test("distributed budget uses atomic Redis reservation and bounded settlement", async () => {
  const source = await readFile(new URL("../src/lib/assistant/aiBudget.ts", import.meta.url), "utf8");
  assert.match(source, /c\+a>l/);
  assert.match(source, /redis\.call\('incrby'/);
  assert.match(source, /redis\.call\('expire'/);
  assert.match(source, /if n<0 then n=0/);
  assert.match(source, /const key = `ai:daily-cost:\$\{now\.toISOString\(\)\.slice\(0, 10\)\}`/);
  assert.doesNotMatch(source, /userId|personId|email|activePerson/);
  const chatRoute = await readFile(new URL("../src/app/api/ai-chat/route.ts", import.meta.url), "utf8");
  assert.match(chatRoute, /stream_options: \{ include_usage: true \}/);
  assert.match(chatRoute, /chunk\.usage\.prompt_tokens/);
});
