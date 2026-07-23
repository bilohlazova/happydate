import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createTranslator } from "next-intl";

import {
  formatGiftRecommendationPrice,
  giftRecommendationCategoryKey,
  giftRecommendationCautionKey,
  giftRecommendationConfidenceKey,
  giftRecommendationSignalKey,
} from "../src/components/gift/GiftRecommendationCard.presenter.ts";
import {
  GIFT_PERSONALIZATION_SIGNALS,
  GIFT_RECOMMENDATION_CATEGORIES,
  GIFT_RECOMMENDATION_CAUTIONS,
  GIFT_RECOMMENDATION_CONFIDENCE,
} from "../src/lib/gift-intelligence/index.ts";

const root = process.cwd();
const locales = ["pl", "uk", "en", "ru", "de"];

async function giftMessages(locale) {
  return JSON.parse(
    await readFile(path.join(root, "messages", locale, "gift.json"), "utf8"),
  );
}

test("GiftRecommendationCard translations cover confidence, categories, signals and cautions", async () => {
  for (const locale of locales) {
    const gift = await giftMessages(locale);
    const t = createTranslator({ locale, messages: { gift } });
    assert.ok(t("gift.recommendationCard.whyTitle"));
    assert.ok(t("gift.recommendationCard.priceUnknown"));

    for (const confidence of GIFT_RECOMMENDATION_CONFIDENCE) {
      const label = t(`gift.recommendationCard.${giftRecommendationConfidenceKey(confidence)}`);
      assert.notEqual(label, confidence);
      assert.ok(label.trim());
    }
    for (const category of GIFT_RECOMMENDATION_CATEGORIES) {
      const label = t(`gift.recommendationCard.${giftRecommendationCategoryKey(category)}`);
      assert.notEqual(label, category);
      assert.ok(label.trim());
    }
    for (const signal of GIFT_PERSONALIZATION_SIGNALS) {
      const label = t(`gift.recommendationCard.${giftRecommendationSignalKey(signal)}`);
      assert.notEqual(label, signal);
      assert.ok(label.trim());
    }
    for (const caution of GIFT_RECOMMENDATION_CAUTIONS) {
      const label = t(`gift.recommendationCard.${giftRecommendationCautionKey(caution)}`);
      assert.notEqual(label, caution);
      assert.ok(label.trim());
    }
  }
});

test("GiftRecommendationCard price presentation handles known and unknown prices", async () => {
  const gift = await giftMessages("pl");
  const t = createTranslator({ locale: "pl", messages: { gift } });
  const known = formatGiftRecommendationPrice(199, "PLN", "pl", t("gift.recommendationCard.priceUnknown"));
  const unknown = formatGiftRecommendationPrice(null, null, "pl", t("gift.recommendationCard.priceUnknown"));
  assert.equal(known, "199 zł");
  assert.equal(t("gift.recommendationCard.priceApprox", { price: known }), "≈ 199 zł");
  assert.equal(unknown, "Cena nieznana");
});

test("GiftRecommendationCard component consumes structured suggestions, not legacy ideas", async () => {
  const source = await readFile(
    path.join(root, "src/components/gift/GiftRecommendationCard.tsx"),
    "utf8",
  );
  assert.match(source, /GiftRecommendationSuggestion/);
  assert.match(source, /suggestion\.personalizationSignals/);
  assert.match(source, /suggestion\.cautions/);
  assert.match(source, /suggestion\.confidence/);
  assert.match(source, /suggestion\.estimatedPrice/);
  assert.doesNotMatch(source, /LegacyIdea|AiIdea|price_range|explanation/);
});

test("GiftRecommendationCard does not render canonical keys directly", async () => {
  const source = await readFile(
    path.join(root, "src/components/gift/GiftRecommendationCard.tsx"),
    "utf8",
  );
  assert.match(source, /t\(giftRecommendationSignalKey\(signal\)\)/);
  assert.match(source, /t\(giftRecommendationCautionKey\(caution\)\)/);
  assert.match(source, /t\(giftRecommendationConfidenceKey\(suggestion\.confidence\)\)/);
  assert.match(source, /t\(giftRecommendationCategoryKey\(suggestion\.category\)\)/);
  assert.doesNotMatch(source, />\{signal\}</);
  assert.doesNotMatch(source, />\{caution\}</);
  assert.doesNotMatch(source, />\{suggestion\.confidence\}</);
});

test("GiftRecommendationCard keeps responsive mobile-first layout assumptions", async () => {
  const source = await readFile(
    path.join(root, "src/components/gift/GiftRecommendationCard.tsx"),
    "utf8",
  );
  assert.match(source, /flex-wrap/);
  assert.match(source, /sm:grid-cols-2/);
  assert.match(source, /min-w-0/);
  assert.doesNotMatch(source, /w-\[(?:1[8-9]|[2-9]\d)rem\]/);
  assert.doesNotMatch(source, /overflow-x/);
});

test("GiftRecommendationCard demo covers high, medium, low, unknown price, cautions and many signals", async () => {
  const source = await readFile(
    path.join(root, "src/components/gift/GiftRecommendationCardDemo.tsx"),
    "utf8",
  );
  for (const value of ["high", "medium", "low", "estimatedPrice: null", "price_uncertain", "limited_context"]) {
    assert.match(source, new RegExp(value));
  }
  for (const signal of ["event", "preference", "memory", "budget", "relation", "season", "age", "gender"]) {
    assert.match(source, new RegExp(`"${signal}"`));
  }
});
