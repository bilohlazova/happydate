import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("daily briefing player supports pause, resume, stop and chunk progress", async () => {
  const hook = await readFile(path.join(root, "src/hooks/useSpeechBrief.ts"), "utf8");
  assert.match(hook, /speechSynthesis\.pause\(\)/);
  assert.match(hook, /speechSynthesis\.resume\(\)/);
  assert.match(hook, /speechSynthesis\.cancel\(\)/);
  assert.match(hook, /setProgress\(/);
  assert.match(hook, /percent:\s*100/);
  assert.match(hook, /return \{ isSupported, speaking, paused, wasInterrupted, error, progress/);
});

test("Home renders an accessible animated waveform with reduced-motion fallback", async () => {
  const player = await readFile(path.join(root, "src/components/home-dashboard/HomeAssistantActions.tsx"), "utf8");
  assert.match(player, /hd-brief-wave/);
  assert.match(player, /role="progressbar"/);
  assert.match(player, /aria-valuenow=\{speech\.progress\.percent\}/);
  assert.match(player, /prefers-reduced-motion:\s*reduce/);
  assert.match(player, /speech\.paused \? labels\.resume/);
  assert.match(player, /onClick=\{speech\.cancel\}/);
});

test("audio player labels exist in all supported Home locales", async () => {
  for (const locale of ["pl", "uk", "en", "ru", "de"]) {
    const messages = JSON.parse(await readFile(path.join(root, "messages", locale, "home.json"), "utf8"));
    for (const key of ["listen", "pause", "resume", "stop", "read", "progress", "interrupted", "modeLabel", "shortMode", "detailedMode"]) {
      assert.ok(messages.assistant[key]?.trim(), `${locale}:assistant.${key}`);
    }
  }
});
