import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { withAiExecutionScope, runMeteredAiCall, parseOpenAiUsage } from "../src/lib/assistant/aiExecution.server.ts";
import { MemoryAiBudget } from "../src/lib/assistant/aiBudget.ts";

const root = new URL("..", import.meta.url).pathname;
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(path);
  }
  return out;
}

test("every OpenAI call site in src sits inside the SEC-01 metered boundary", async () => {
  for (const file of await walk(join(root, "src"))) {
    const source = await readFile(file, "utf8");
    if (!/new OpenAI\(/.test(source)) continue;
    assert.match(source, /runMeteredAi(Call|Stream)\(/, `${file} calls OpenAI without runMeteredAiCall/Stream`);
    // The client must be created inside the metered callback, never hoisted.
    for (const match of source.matchAll(/new OpenAI\(/g)) {
      const before = source.slice(Math.max(0, match.index - 400), match.index);
      assert.match(before, /call:\s*(\(\)\s*=>|async\s*\(\)\s*=>)|\(\)\s*=>\s*(runMeteredAi|new)/s, `${file}: provider client is not created inside a metered call`);
    }
  }
});

test("no HappyBot module reserves or settles budget on its own", async () => {
  const files = [
    "src/app/api/ai-chat/route.ts",
    "src/app/api/ai/gift-suggestions/route.ts",
    "src/lib/assistant/giftTool.server.ts",
    "src/lib/assistant/conversationMemory.server.ts",
    "src/lib/gift-intelligence/giftRecommendationService.server.ts",
    "src/lib/gift-intelligence/giftProductSearch.server.ts",
  ];
  for (const file of files) {
    const source = await readFile(join(root, file), "utf8");
    assert.doesNotMatch(source, /\.reserve\(|createConfiguredAiBudget|reservation\.settle|\.settle\(/, file);
    assert.doesNotMatch(source, /ASSISTANT_CHAT_CONFIG\.(model|giftModel|utilityModel)\s*=\s*/, file);
  }
});

test("each model round of one chat turn is metered separately and the budget cuts off a runaway turn", async () => {
  const reservations = [];
  let providerCalls = 0;
  const identity = { kind: "authenticated", key: "synthetic-owner" };
  // Budget that only fits two worst-case calls.
  const inner = new MemoryAiBudget(0.05);
  const controls = {
    limiter: { check: async () => ({ allowed: true, remaining: 10, resetAt: Date.now() + 1_000 }) },
    budget: { reserve: async (input, max) => { const r = await inner.reserve(input, max); reservations.push(r.allowed); return r; } },
  };
  // One user message that triggers chat round 1 + gift generation + product search + chat round 2.
  const features = ["chat", "gifts", "gift-search", "chat", "chat-summary"];
  const outcomes = [];
  for (const feature of features) {
    try {
      await withAiExecutionScope(identity, () => runMeteredAiCall({
        feature, model: "gpt-4.1-mini", payload: { input: "x".repeat(40_000) }, maxOutputTokens: 4_000,
        call: async () => { providerCalls += 1; return {}; },
        usage: () => null,
      }), controls);
      outcomes.push("ok");
    } catch (error) { outcomes.push(error.code); }
  }
  assert.equal(providerCalls, reservations.filter(Boolean).length, "provider is only reached after an allowed reservation");
  assert.ok(reservations.length === features.length, "every call reserved separately");
  assert.ok(outcomes.includes("daily_ai_budget_exceeded"), JSON.stringify(outcomes));
  assert.ok(providerCalls < features.length, "budget stopped later calls");
});

test("web search cost is added to settled usage and missing usage keeps the reservation", async () => {
  const source = await readFile(join(root, "src/lib/gift-intelligence/giftProductSearch.server.ts"), "utf8");
  assert.match(source, /SEARCH_CALL_COST_UNITS \* collectUrls\(value\.output\)\.searchCalls/);
  assert.match(source, /if \(!tokens\) return null/);
  assert.equal(parseOpenAiUsage({ input_tokens: 0, output_tokens: 5 }, "responses"), null);
});

test("unpriced models fail closed: HappyBot roles all use the priced model", async () => {
  const { ASSISTANT_CHAT_CONFIG } = await import("../src/lib/assistant/chatConfig.ts");
  const { AI_COST_POLICY } = await import("../src/lib/assistant/aiBudget.ts");
  for (const model of [ASSISTANT_CHAT_CONFIG.model, ASSISTANT_CHAT_CONFIG.giftModel, ASSISTANT_CHAT_CONFIG.utilityModel]) {
    assert.equal(model, AI_COST_POLICY.model);
  }
  await assert.rejects(() => withAiExecutionScope({ kind: "authenticated", key: "u" }, () => runMeteredAiCall({
    feature: "gifts", model: "gpt-4.1", payload: {}, maxOutputTokens: 10, call: async () => ({}), usage: () => null,
  }), { limiter: null, budget: null }), (error) => error.status === 503);
});

test("search fee is reserved up front: an over-budget search is rejected before any provider call", async () => {
  const budget = new MemoryAiBudget(0.1, () => new Date("2026-11-22T12:00:00Z"));
  let providerCalls = 0;
  const run = (overhead) => withAiExecutionScope({ kind: "authenticated", key: "u1" }, () => runMeteredAiCall({
    feature: "gift-search", model: "gpt-4.1-mini", payload: { a: 1 }, maxOutputTokens: 100, reservedInputOverhead: overhead,
    call: async () => { providerCalls += 1; return { usage: { input_tokens: 10, output_tokens: 1 } }; },
    usage: (value) => parseOpenAiUsage(value.usage, "responses"),
  }), { budget, limiter: null === 1 ? null : { check: async () => ({ allowed: true, remaining: 1, resetAt: Date.now() + 1000 }) } });
  // $0.10 budget = 250 000 units; three searches at ~25 000 units each fit, a 300 000-unit reserve must not.
  await assert.rejects(run(300_000), (error) => error.code === "daily_ai_budget_exceeded" || error.status === 429);
  assert.equal(providerCalls, 0);
  await run(75_000);
  assert.equal(providerCalls, 1);
  await assert.rejects(run(-1), (error) => error.status === 503);
});

test("product search is opt-in, capped by max_tool_calls and reserves the full search fee", async () => {
  const source = await readFile(join(root, "src/lib/gift-intelligence/giftProductSearch.server.ts"), "utf8");
  assert.match(source, /GIFT_PRODUCT_SEARCH\?\.trim\(\) === "1"/);
  assert.match(source, /max_tool_calls: PRODUCT_SEARCH_MAX_TOOL_CALLS/);
  assert.match(source, /reservedInputOverhead: SEARCH_CALL_COST_UNITS \* PRODUCT_SEARCH_MAX_TOOL_CALLS/);
  assert.doesNotMatch(source, /GIFT_PRODUCT_SEARCH\?\.trim\(\) !== "0"/);
});
