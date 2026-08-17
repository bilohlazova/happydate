import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createTranslator } from "next-intl";

const locales = ["uk", "en", "pl", "de", "ru"];

test("day planning is a first-class localized Happy action", async () => {
  const modal = await readFile(new URL("../src/components/ChatAssistantModal.tsx", import.meta.url), "utf8");
  assert.match(modal, /id: "dayPlan", icon: CalendarCheck2/);
  for (const locale of locales) {
    const messages = JSON.parse(await readFile(new URL(`../messages/${locale}/assistant.json`, import.meta.url), "utf8"));
    const t = createTranslator({ locale, messages: { assistant: messages } });
    assert.ok(t("assistant.actions.dayPlan.title"));
    assert.ok(t("assistant.actions.dayPlan.description"));
    assert.ok(t("assistant.actions.dayPlan.prompt"));
  }
});

test("the provider receives a server-verified local date but guests do not", async () => {
  const [contract, verified, repository] = await Promise.all([
    readFile(new URL("../src/lib/assistant/chatContract.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/assistant/verifiedAssistantContext.server.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/repositories/home/home.repository.ts", import.meta.url), "utf8"),
  ]);
  assert.match(contract, /CURRENT LOCAL DATE \(SERVER VERIFIED\)/);
  assert.match(verified, /knowledgeReviewPreferences\.timezone \?\? "UTC"/);
  assert.match(verified, /currentDate: today/);
  assert.match(repository, /knowledge_review_voice_enabled, timezone/);
});
