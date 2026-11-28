import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { classifyAiAvailabilityError } from "../src/lib/assistant/aiAvailability.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("expanded HappyBot is a centred large overlay on desktop, not a 460px corner card", async () => {
  const modal = await read("../src/components/ChatAssistantModal.tsx");
  const css = await read("../src/app/globals.css");
  assert.doesNotMatch(modal, /md:w-\[460px\]|md:right-6|md:left-auto/);
  assert.match(modal, /happy-chat-backdrop fixed inset-0[^"]*flex items-end justify-center/);
  assert.match(css, /@media \(min-width: 768px\) \{\s*\.happy-chat-backdrop \{ align-items: center;[\s\S]*?width: min\(880px, 100%\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /--hd-happybot-vvh/);
});

test("a missing AI configuration is classified distinctly and never as a generic retry", () => {
  assert.deepEqual(classifyAiAvailabilityError({ status: 503, error: "ai_not_configured" }), { code: "ai_not_configured", retryAfter: null });
  assert.deepEqual(classifyAiAvailabilityError({ status: 503, error: "service_unavailable" }), { code: "request_failed", retryAfter: null });
});

test("configuration-missing logs names of missing settings only and keeps the guard closed", async () => {
  const route = await read("../src/app/api/ai-chat/route.ts");
  assert.match(route, /getMissingAssistantConfiguration\(\)\.join\("\."\)/);
  assert.match(route, /error: "ai_not_configured" },\s*\{ status: 503/);
});
