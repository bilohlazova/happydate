import type {
  GiftPersonalizationSignal,
  GiftRecommendationCaution,
  GiftRecommendationCategory,
  GiftRecommendationConfidence,
} from "@/lib/gift-intelligence";

export const GIFT_RECOMMENDATION_CATEGORY_ICONS: Record<
  GiftRecommendationCategory,
  string
> = {
  experience: "✨",
  book: "📚",
  food_drink: "☕",
  flowers: "💐",
  electronics: "🎧",
  beauty: "🧴",
  home: "🏡",
  fashion: "🧣",
  subscription: "🔁",
  travel: "🧳",
  hobby: "🎯",
  other: "🎁",
};

export const GIFT_RECOMMENDATION_SIGNAL_ICONS: Record<
  GiftPersonalizationSignal,
  string
> = {
  relation: "👤",
  event: "📅",
  interest: "🎯",
  preference: "❤️",
  memory: "📖",
  previous_gift_avoidance: "↪️",
  budget: "💰",
  season: "🌤️",
  age: "🎈",
  gender: "🚻",
};

export const GIFT_RECOMMENDATION_CAUTION_ICONS: Record<
  GiftRecommendationCaution,
  string
> = {
  price_uncertain: "≈",
  limited_context: "✨",
  legacy_fallback: "↩️",
  verify_availability: "!",
};

export function giftRecommendationCategoryKey(
  category: GiftRecommendationCategory,
): `categories.${GiftRecommendationCategory}` {
  return `categories.${category}`;
}

export function giftRecommendationConfidenceKey(
  confidence: GiftRecommendationConfidence,
): `confidence.${GiftRecommendationConfidence}` {
  return `confidence.${confidence}`;
}

export function giftRecommendationSignalKey(
  signal: GiftPersonalizationSignal,
): `signals.${GiftPersonalizationSignal}` {
  return `signals.${signal}`;
}

export function giftRecommendationCautionKey(
  caution: GiftRecommendationCaution,
): `cautions.${GiftRecommendationCaution}` {
  return `cautions.${caution}`;
}

function formatNumber(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatGiftRecommendationPrice(
  estimatedPrice: number | null,
  currency: string | null,
  locale: string,
  unknownLabel: string,
): string {
  if (estimatedPrice === null) return unknownLabel;
  const normalizedCurrency = currency?.trim().toLocaleUpperCase() || null;
  if (normalizedCurrency === "PLN") {
    return `${formatNumber(estimatedPrice, locale)} zł`;
  }
  if (!normalizedCurrency) {
    return formatNumber(estimatedPrice, locale);
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: Number.isInteger(estimatedPrice) ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(estimatedPrice);
  } catch {
    return `${formatNumber(estimatedPrice, locale)} ${normalizedCurrency}`;
  }
}
