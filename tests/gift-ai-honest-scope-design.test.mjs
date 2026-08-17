import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("gift AI keeps useful ideation live while future commerce is explicit", async () => {
  const page = await readFile(
    path.join(root, "src/app/services/asystent-ai/page.tsx"),
    "utf8",
  );

  assert.match(page, /availableNow/);
  assert.match(page, /<AskAIButton/);
  assert.match(page, /<ChatModalControllerAI/);
  assert.match(page, /<ComingSoonNotice/);
  assert.match(page, /soon\.detail/);
  assert.doesNotMatch(page, /AIHowItWorks|AIFAQ|featureItems\.human/);
});

test("current AI boundaries and future commerce status are localized", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const assistant = JSON.parse(
      await readFile(path.join(root, `messages/${locale}/static.json`), "utf8"),
    ).services.phase3b.assistant;

    assert.equal(Object.keys(assistant.currentFeatures).length, 3);
    assert.equal(Object.keys(assistant.currentSteps).length, 3);
    assert.ok(assistant.aiBoundary);
    assert.ok(assistant.soon.badge);
    assert.ok(assistant.soon.detail);
  }
});
