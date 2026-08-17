import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createTranslator } from "next-intl";

import {
  mapLegacyIdeaToStructuredSuggestion,
  normalizeGiftSuggestionResponse,
} from "../src/lib/gifts/giftRecommendationClient.ts";

const root = process.cwd();
const locales = ["pl", "uk", "en", "ru", "de"];

async function source(file) {
  return readFile(path.join(root, file), "utf8");
}

test("Gift Workspace renders structured suggestions through GiftRecommendationCard", async () => {
  const content = await source("src/app/gift/start/StartPageContent.tsx");
  assert.match(content, /requestGiftRecommendations/);
  assert.match(content, /recommendations\.suggestions\.map/);
  assert.match(content, /<GiftRecommendationCard/);
  assert.match(content, /suggestion=\{suggestion\}/);
  assert.doesNotMatch(content, /ideas\.map/);
});

test("multiple suggestions, follow-up questions and empty success state are rendered semantically", async () => {
  const content = await source("src/app/gift/start/StartPageContent.tsx");
  assert.match(content, /<ol[\s\S]*recommendations\.suggestions\.map/);
  assert.match(content, /recommendations\.followUpQuestions\.length > 0/);
  assert.match(content, /recommendations\.followUpQuestions\.map/);
  assert.match(content, /<ul[\s\S]*recommendations\.followUpQuestions\.map/);
  assert.match(content, /emptyTitle/);
  assert.match(content, /role="status"/);
});

test("legacy ideas use the compatibility adapter before reaching the card", () => {
  const suggestion = mapLegacyIdeaToStructuredSuggestion({
    title: "Headphones",
    explanation: "Older explanation",
    why: "Older reason",
    price_range: "100 PLN",
  });
  assert.deepEqual(suggestion, {
    title: "Headphones",
    category: "other",
    why: "Older reason",
    confidence: "low",
    estimatedPrice: null,
    currency: null,
    personalizationSignals: [],
    cautions: ["legacy_fallback", "limited_context"],
  });
});

test("structured suggestions are preferred over legacy ideas when both are present", () => {
  const result = normalizeGiftSuggestionResponse({
    suggestions: [{
      title: "Museum tickets",
      category: "experience",
      why: "Matches the event.",
      confidence: "medium",
      estimatedPrice: 120,
      currency: "PLN",
      personalizationSignals: ["event"],
      cautions: [],
    }],
    ideas: [{ title: "Legacy", explanation: "Old" }],
    followUpQuestions: ["What budget should I use?"],
    cached: false,
  });
  assert.equal(result.usedLegacyFallback, false);
  assert.deepEqual(result.suggestions.map((item) => item.title), ["Museum tickets"]);
  assert.deepEqual(result.followUpQuestions, ["What budget should I use?"]);
});

test("legacy fallback has low confidence and never fabricates price", () => {
  const result = normalizeGiftSuggestionResponse({
    ideas: [{ title: "Book", explanation: "Safe legacy context", price_range: "50 PLN" }],
  });
  assert.equal(result.usedLegacyFallback, true);
  assert.equal(result.suggestions[0].confidence, "low");
  assert.equal(result.suggestions[0].estimatedPrice, null);
  assert.equal(result.suggestions[0].currency, null);
  assert.deepEqual(result.suggestions[0].personalizationSignals, []);
  assert.ok(result.suggestions[0].cautions.includes("legacy_fallback"));
});

test("empty successful response keeps retry path and follow-up questions", () => {
  const result = normalizeGiftSuggestionResponse({
    suggestions: [],
    followUpQuestions: ["question:missing_budget"],
  });
  assert.equal(result.usedLegacyFallback, false);
  assert.deepEqual(result.suggestions, []);
  assert.deepEqual(result.followUpQuestions, ["question:missing_budget"]);
});

test("current gift actions preserve saving and retry without future commerce", async () => {
  const content = await source("src/app/gift/start/StartPageContent.tsx");
  assert.match(content, /recommendations\.saveForPerson/);
  assert.match(content, /recommendations\.retry/);
  assert.doesNotMatch(content, /useInRequest|backToForm|gift-request-form|form\.submit|form\.share/);
});

test("locale labels are used and raw canonical signal or caution keys are not displayed", async () => {
  const [content, card] = await Promise.all([
    source("src/app/gift/start/StartPageContent.tsx"),
    source("src/components/gift/GiftRecommendationCard.tsx"),
  ]);
  assert.match(content, /useTranslations\("gift"\)/);
  assert.match(card, /giftRecommendationSignalKey/);
  assert.match(card, /giftRecommendationCautionKey/);
  assert.doesNotMatch(card, />\{signal\}</);
  assert.doesNotMatch(card, />\{caution\}</);

  for (const locale of locales) {
    const gift = JSON.parse(await source(`messages/${locale}/gift.json`));
    const t = createTranslator({ locale, messages: { gift } });
    assert.ok(t("gift.recommendations.followUpTitle"));
    assert.ok(t("gift.recommendations.emptyTitle"));
    assert.ok(t("gift.recommendations.retry"));
    assert.ok(t("gift.recommendationCard.cautions.legacy_fallback"));
  }
});

test("React rendering does not contain the legacy adapter logic", async () => {
  const content = await source("src/app/gift/start/StartPageContent.tsx");
  assert.doesNotMatch(content, /mapLegacyIdeaToStructuredSuggestion/);
  assert.doesNotMatch(content, /price_range/);
  assert.doesNotMatch(content, /legacy_fallback/);
});
