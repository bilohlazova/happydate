import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createTranslator } from "next-intl";

import {
  classifyAiAvailabilityError,
  normalizeAiRetryAfter,
} from "../src/lib/assistant/aiAvailability.ts";

const root = process.cwd();
const locales = ["uk", "en", "pl", "de", "ru"];

test("daily AI budget exhaustion is classified without exposing provider details", () => {
  assert.deepEqual(classifyAiAvailabilityError({
    status: 429,
    error: "daily_ai_budget_exceeded",
    retryAfter: 7_201.2,
  }), {
    code: "daily_ai_budget_exceeded",
    retryAfter: 7_202,
  });
  assert.deepEqual(classifyAiAvailabilityError({
    status: 503,
    error: "secret_provider_failure",
  }), {
    code: "request_failed",
    retryAfter: null,
  });
});

test("retry delays are bounded for safe UI timers", () => {
  assert.equal(normalizeAiRetryAfter("bad", 60), 60);
  assert.equal(normalizeAiRetryAfter(-1, 60), 60);
  assert.equal(normalizeAiRetryAfter(999_999), 90_000);
});

test("chat and gift budget states are localized in every product language", async () => {
  for (const locale of locales) {
    const [assistant, gift] = await Promise.all([
      readFile(path.join(root, `messages/${locale}/assistant.json`), "utf8").then(JSON.parse),
      readFile(path.join(root, `messages/${locale}/gift.json`), "utf8").then(JSON.parse),
    ]);
    const t = createTranslator({ locale, messages: { assistant, gift } });
    assert.ok(t("assistant.conversation.dailyBudget"));
    assert.ok(t("gift.recommendations.errors.daily_ai_budget_exceeded"));
    assert.ok(t("gift.recommendations.retryAfter", { hours: 2 }));
  }
});

test("chat keeps the failed user turn retryable and gift keeps discovery state", async () => {
  const [chat, gift] = await Promise.all([
    readFile(path.join(root, "src/components/ChatAssistantModal.tsx"), "utf8"),
    readFile(path.join(root, "src/app/gift/start/StartPageContent.tsx"), "utf8"),
  ]);
  assert.match(chat, /userMessage\.content, conversation, assistantMessageId/);
  assert.match(chat, /daily_ai_budget_exceeded/);
  assert.match(gift, /retryAfter: result\.retryAfter/);
  assert.doesNotMatch(gift, /setDiscoveryAnswers\(\{\}\)[\s\S]{0,120}daily_ai_budget_exceeded/);
});
