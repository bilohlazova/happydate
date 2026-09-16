import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/lib/assistant/buildHappyPersonContext.ts", import.meta.url), "utf8");

test("gift context uses the verified full history and scopes it to the requested person", () => {
  assert.match(source, /data\.giftHistory\?\.filter\(\(gift\) => gift\.personId === event\?\.personId\)/);
  assert.match(source, /\$\{gift\.title\} — \$\{gift\.lifecycle\}/);
});

test("pending outcomes remain a safe lifecycle-labelled fallback", () => {
  assert.match(source, /gift\.title\} — given/);
  assert.doesNotMatch(source, /previousGifts: previousGifts\.map\(\(gift\) => gift\.title\)/);
});

test("normal context without a gift request remains unaffected", () => {
  assert.match(source, /if \(!person \|\| !event\?\.personId\) return null/);
});
