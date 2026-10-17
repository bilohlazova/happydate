import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/app/onboarding-preview/page.tsx", import.meta.url), "utf8");

test("onboarding preview is a local-only interactive flow", () => {
  assert.match(source, /setStep/);
  assert.match(source, /aria-pressed/);
  assert.match(source, /onboarding-birthday/);
  assert.match(source, /setDreams/);
  assert.doesNotMatch(source, /\.rpc\(/);
  assert.doesNotMatch(source, /\.insert\(/);
  assert.doesNotMatch(source, /\.update\(/);
  assert.doesNotMatch(source, /\.upsert\(/);
});

test("preview keeps the existing survey route separate", async () => {
  const survey = await readFile(new URL("../src/app/survey/page.tsx", import.meta.url), "utf8");
  assert.match(survey, /save_my_onboarding_survey/);
  assert.match(source, /\/profile/);
});
