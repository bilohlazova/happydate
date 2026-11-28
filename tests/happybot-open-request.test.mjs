// HD-CHAT-002 Phase 1A: pure rules of the one open() entry (no React, no I/O).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HAPPYBOT_LEGACY_OPEN_EVENTS, resolveOpenRequest, sameGiftRequest, sameScope } from "../src/lib/happybot/openRequest.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("an empty open() request is the neutral general chat", () => {
  for (const input of [undefined, null, {}]) {
    assert.deepEqual(resolveOpenRequest(input), { scope: { type: "global" }, giftRequest: null, initialPrompt: null });
  }
});

test("blank prompts are dropped, real ones are kept verbatim, scope and gift pass through", () => {
  assert.equal(resolveOpenRequest({ initialPrompt: "   " }).initialPrompt, null);
  assert.equal(resolveOpenRequest({ initialPrompt: "" }).initialPrompt, null);
  assert.equal(resolveOpenRequest({ initialPrompt: " Привіт " }).initialPrompt, " Привіт ");
  const gift = { personId: "p", eventId: "e", mode: "selection" };
  const resolved = resolveOpenRequest({ scope: { type: "task", taskId: "t" }, giftRequest: gift });
  assert.deepEqual(resolved.scope, { type: "task", taskId: "t" });
  assert.equal(resolved.giftRequest, gift);
});

test("sameScope compares by type and id, and treats missing as global", () => {
  assert.ok(sameScope(undefined, { type: "global" }));
  assert.ok(sameScope({ type: "person", personId: "a" }, { type: "person", personId: "a" }));
  assert.ok(!sameScope({ type: "person", personId: "a" }, { type: "person", personId: "b" }));
  assert.ok(!sameScope({ type: "person", personId: "a" }, { type: "event", eventId: "a" }));
  assert.ok(!sameScope({ type: "task", taskId: "a" }, { type: "global" }));
});

test("sameGiftRequest counts the mode, because it changes the prompt", () => {
  const base = { personId: "p", eventId: "e" };
  assert.ok(sameGiftRequest(null, undefined));
  assert.ok(sameGiftRequest({ ...base, mode: "selection" }, base));
  assert.ok(!sameGiftRequest({ ...base, mode: "supplementary" }, base));
  assert.ok(!sameGiftRequest(base, null));
  assert.ok(!sameGiftRequest(base, { ...base, eventId: "other" }));
});

async function sourceFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

test("static guard: exactly one place mounts the HappyBot (the provider), and the layout mounts it inside AuthProvider", async () => {
  const mounters = [];
  for (const file of await sourceFiles(path.join(root, "src"))) {
    const source = await readFile(file, "utf8");
    if (/<UserScopedChatAssistant\b|<ChatAssistantModal\b/.test(source)) mounters.push(path.relative(root, file));
  }
  assert.deepEqual(mounters.sort(), ["src/components/assistant/UserScopedChatAssistant.tsx", "src/components/happybot/HappyBotProvider.tsx"]);
  const layout = await readFile(path.join(root, "src/app/layout.tsx"), "utf8");
  assert.match(layout, /<AuthProvider>[\s\S]*<HappyBotProvider>[\s\S]*<\/HappyBotProvider>[\s\S]*<\/AuthProvider>/);
});

test("static guard: the legacy launch events are handled only by the provider", async () => {
  const listeners = [];
  for (const file of await sourceFiles(path.join(root, "src"))) {
    const source = await readFile(file, "utf8");
    if (/addEventListener\(\s*["'](hd:openChat|happydate:open-chat)["']/.test(source)) listeners.push(path.relative(root, file));
  }
  assert.deepEqual(listeners, [], "literal listeners must not exist outside the provider's constant list");
  const provider = await readFile(path.join(root, "src/components/happybot/HappyBotProvider.tsx"), "utf8");
  assert.match(provider, /HAPPYBOT_LEGACY_OPEN_EVENTS/);
  assert.deepEqual([...HAPPYBOT_LEGACY_OPEN_EVENTS], ["hd:openChat", "happydate:open-chat"]);
});

test("static guard: the provider makes no network call, no DB write and no web-storage write", async () => {
  for (const file of ["src/components/happybot/HappyBotProvider.tsx", "src/components/happybot/useHappyBot.ts", "src/lib/happybot/openRequest.ts"]) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.doesNotMatch(source, /\bfetch\s*\(|\/api\/ai-chat|supabase\s*\.\s*from|localStorage|sessionStorage|indexedDB/, file);
  }
});

test("static guard: entry points do not call the AI API on mount", async () => {
  for (const file of ["src/components/HomePageClient.tsx", "src/components/people/PersonProfileContent.tsx"]) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.doesNotMatch(source, /\/api\/ai-chat/, file);
  }
});
