import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("briefing pauses when hidden and never auto-resumes on return", async () => {
  const hook = await readFile(path.join(root, "src/hooks/useSpeechBrief.ts"), "utf8");
  assert.match(hook, /document\.addEventListener\("visibilitychange"/);
  assert.match(hook, /document\.visibilityState === "hidden"/);
  assert.match(hook, /speechSynthesis\.pause\(\)/);
  const visibilityHandler = hook.slice(hook.indexOf("const handleVisibility"), hook.indexOf("const handlePageHide"));
  assert.doesNotMatch(visibilityHandler, /speechSynthesis\.resume\(\)/);
});

test("system and page lifecycle interruptions invalidate the active speech session", async () => {
  const hook = await readFile(path.join(root, "src/hooks/useSpeechBrief.ts"), "utf8");
  assert.match(hook, /window\.addEventListener\("pagehide"/);
  assert.match(hook, /sessionRef\.current \+= 1/);
  assert.match(hook, /event\.error === "interrupted"/);
  assert.match(hook, /setWasInterrupted\(true\)/);
});

test("interruption feedback is visible and announced without claiming background playback", async () => {
  const player = await readFile(path.join(root, "src/components/home-dashboard/HomeAssistantActions.tsx"), "utf8");
  assert.match(player, /speech\.wasInterrupted/);
  assert.match(player, /labels\.interrupted/);
  assert.match(player, /role="status"/);
  assert.doesNotMatch(player, /background playback|continues in background/i);
});
