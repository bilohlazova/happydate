import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { briefingTextForMode } from "../src/lib/home/buildDailyBriefing.ts";

const briefing = {
  text: "all",
  sourceIds: ["event", "memory"],
  sections: [
    { id: "g", kind: "greeting", text: "Hello.", sourceIds: [] },
    { id: "t", kind: "today", text: "Nothing today.", sourceIds: [] },
    { id: "u", kind: "upcoming", text: "Birthday soon.", sourceIds: ["event"] },
    { id: "c", kind: "person-context", text: "Saved flowers.", sourceIds: ["memory"] },
    { id: "q", kind: "care-question", text: "Need help?", sourceIds: ["event"] },
    { id: "p", kind: "post-gift-question", text: "Did they like it?", sourceIds: ["gift"] },
    { id: "r", kind: "knowledge-review-question", text: "Is this still true?", sourceIds: ["knowledge"] },
  ],
};

test("short mode keeps only essential timing while detailed mode includes context and care", () => {
  assert.equal(briefingTextForMode(briefing, "short"), "Hello. Nothing today. Birthday soon.");
  assert.equal(briefingTextForMode(briefing, "detailed"), "Hello. Nothing today. Birthday soon. Saved flowers. Need help? Did they like it? Is this still true?");
});

test("Home mode control is user-selected, persistent and stops current playback before switching", async () => {
  const player = await readFile(path.join(process.cwd(), "src/components/home-dashboard/HomeAssistantActions.tsx"), "utf8");
  assert.match(player, /happydate:briefing-mode/);
  assert.match(player, /localStorage\.setItem/);
  assert.match(player, /speech\.cancel\(\);[\s\S]*setMode\(next\)/);
  assert.match(player, /aria-pressed=\{mode === "short"\}/);
  assert.match(player, /aria-pressed=\{mode === "detailed"\}/);
});
