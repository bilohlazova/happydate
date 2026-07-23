import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createTranslator } from "next-intl";

import { GIFT_DISCOVERY_QUESTION_TYPES } from "../src/lib/gift-discovery/index.ts";

const root = process.cwd();
const locales = ["pl", "uk", "en", "ru", "de"];

async function source(file) {
  return readFile(path.join(root, file), "utf8");
}

async function giftMessages(locale) {
  return JSON.parse(await source(`messages/${locale}/gift.json`));
}

test("GiftDiscoveryPanel exposes the approved component API and calls callbacks", async () => {
  const content = await source("src/components/gift/GiftDiscoveryPanel.tsx");
  assert.match(content, /export interface GiftDiscoveryPanelProps/);
  assert.match(content, /followUpQuestions: readonly GiftDiscoveryQuestion\[\]/);
  assert.match(content, /completionScore: number/);
  assert.match(content, /onAnswer: \(questionId: string, value: GiftDiscoveryAnswerValue\) => void/);
  assert.match(content, /onSkip: \(questionId: string\) => void/);
  assert.match(content, /loading\?: boolean/);
  assert.match(content, /onAnswer\(currentQuestion\.id, answerValue\)/);
  assert.match(content, /onAnswer\(currentQuestion\.id, option\)/);
  assert.match(content, /onSkip\(currentQuestion\.id\)/);
});

test("GiftDiscoveryPanel renders progress, one current question, completion and loading states", async () => {
  const content = await source("src/components/gift/GiftDiscoveryPanel.tsx");
  assert.match(content, /role="progressbar"/);
  assert.match(content, /aria-valuenow=\{completion\}/);
  assert.match(content, /followUpQuestions\.find/);
  assert.doesNotMatch(content, /followUpQuestions\.map/);
  assert.match(content, /completeTitle/);
  assert.match(content, /completeDescription/);
  assert.match(content, /role="status"/);
  assert.match(content, /aria-live="polite"/);
  assert.match(content, /loading/);
});

test("GiftDiscoveryPanel supports every canonical question type with appropriate controls", async () => {
  const content = await source("src/components/gift/GiftDiscoveryPanel.tsx");
  for (const type of GIFT_DISCOVERY_QUESTION_TYPES) {
    assert.match(content, new RegExp(type), type);
    const gift = await giftMessages("en");
    const t = createTranslator({ locale: "en", messages: { gift } });
    assert.ok(t(`gift.discovery.questions.${type}.label`));
    assert.ok(t(`gift.discovery.questions.${type}.helper`));
  }
  assert.match(content, /type === "budget" \? "number"/);
  assert.match(content, /type === "dislikedGifts"/);
  assert.match(content, /textarea/);
  assert.match(content, /relationshipStrength: \["close", "medium", "distant"\]/);
  assert.match(content, /preferredStyle: \["practical", "emotional", "elegant"\]/);
  assert.match(content, /urgency: \["today", "thisWeek", "flexible"\]/);
});

test("GiftDiscoveryPanel localization exists for all supported locales", async () => {
  for (const locale of locales) {
    const gift = await giftMessages(locale);
    const t = createTranslator({ locale, messages: { gift } });
    for (const key of [
      "title",
      "subtitle",
      "completion",
      "progressLabel",
      "loading",
      "completeTitle",
      "completeDescription",
      "actions.answer",
      "actions.skip",
    ]) {
      assert.ok(t(`gift.discovery.${key}`, { value: 75 }));
    }
    for (const type of GIFT_DISCOVERY_QUESTION_TYPES) {
      assert.ok(t(`gift.discovery.questions.${type}.label`));
      assert.ok(t(`gift.discovery.questions.${type}.helper`));
    }
  }
});

test("Gift Workspace integrates GiftDiscoveryPanel without parsing visible follow-up text", async () => {
  const [content, client, route] = await Promise.all([
    source("src/app/gift/start/StartPageContent.tsx"),
    source("src/lib/gifts/giftRecommendationClient.ts"),
    source("src/app/api/ai/gift-suggestions/route.ts"),
  ]);
  assert.match(content, /<GiftDiscoveryPanel/);
  assert.match(content, /visibleDiscoveryQuestions\(recommendations\.discovery\?\.remainingQuestions\)/);
  assert.match(content, /completionScore=\{recommendations\.discovery\?\.completionScore \?\? 0\}/);
  assert.match(content, /onAnswer=\{handleDiscoveryAnswer\}/);
  assert.match(content, /onSkip=\{handleDiscoverySkip\}/);
  assert.match(client, /discovery: GiftDiscoveryPromptInput \| null/);
  assert.match(client, /discovery\(response\.discovery\)/);
  assert.match(route, /discovery: giftDiscoveryPromptInput/);
  assert.doesNotMatch(content, /JSON\.parse\(recommendations\.followUpQuestions/);
});

test("GiftDiscoveryPanel remains presentation-only and UI-safe", async () => {
  const content = await source("src/components/gift/GiftDiscoveryPanel.tsx");
  for (const forbidden of [
    "fetch(",
    ".from(",
    "supabase",
    "OpenAI",
    "localStorage",
    "sessionStorage",
  ]) {
    assert.equal(content.includes(forbidden), false, forbidden);
  }
  assert.match(content, /MobileUI\.card/);
  assert.match(content, /dark:/);
  assert.doesNotMatch(content, /w-\[(?:1[8-9]|[2-9]\d)rem\]/);
  assert.doesNotMatch(content, /overflow-x/);
});
