import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { selectPersonHistoryForPrompt } from "../src/lib/assistant/conversationMemory.ts";
import { buildUnifiedPersonContext } from "../src/lib/person-context/buildUnifiedPersonContext.ts";

const row = (id, user, happy, day) => ({ id, userMessage: user, happyResponse: happy, createdAt: `2026-11-${String(day).padStart(2, "0")}T10:00:00.000Z` });
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("same exchange in both stores enters the prompt once (different ids)", () => {
  const out = selectPersonHistoryForPrompt({
    current: [row("c1", "Ліка любить каву", "Запам'ятала", 20)],
    legacy: [row("l1", "ліка любить  каву", "Запам'ятала", 20)],
  });
  assert.equal(out.length, 1);
});

test("a message already in the live conversation window is not repeated from storage", () => {
  const out = selectPersonHistoryForPrompt({
    current: [row("c1", "Який бюджет?", "500", 20), row("c2", "Старе питання", "Стара відповідь", 19)],
    legacy: [row("l1", "Який бюджет?", "500", 20)],
    conversation: [{ role: "user", content: "Який бюджет?" }, { role: "assistant", content: "500" }],
  });
  assert.deepEqual(out.map((t) => t.userMessage), ["Старе питання"]);
});

test("legacy-only history is kept (compatibility), newest first, capped at 6", () => {
  const legacy = Array.from({ length: 9 }, (_, i) => row(`l${i}`, `q${i}`, `a${i}`, 10 + i));
  const out = selectPersonHistoryForPrompt({ current: [], legacy });
  assert.equal(out.length, 6);
  assert.equal(out[0].userMessage, "q8");
});

test("end to end: the user's message appears once in the person profile prompt text", () => {
  const merged = selectPersonHistoryForPrompt({
    current: [row("c1", "UNIQUE-MARKER-123", "ok", 20)],
    legacy: [row("l1", "UNIQUE-MARKER-123", "ok", 20)],
  });
  const ctx = buildUnifiedPersonContext({ personId: "p1", personName: "Ліка", relationLabel: null, birthday: null, knowledge: [], symbol: null, pets: [], happyConversations: merged, locale: "uk" });
  assert.equal((ctx.forChat ?? "").split("UNIQUE-MARKER-123").length - 1, 1);
});

test("wiring: route and gift service use the merged read path; legacy write is kept", async () => {
  const route = await read("../src/app/api/ai-chat/route.ts");
  assert.match(route, /loadMergedPersonHistory\(/);
  assert.match(route, /happyConversations: mergedPersonHistory/);
  assert.doesNotMatch(route, /happyConversations: serverHappyConversations/);
  assert.match(route, /savePersonHappyConversation\(/, "legacy write stays until every consumer is migrated");
  const gift = await read("../src/lib/gift-intelligence/giftRecommendationService.server.ts");
  assert.match(gift, /loadMergedPersonHistory\(/);
});
