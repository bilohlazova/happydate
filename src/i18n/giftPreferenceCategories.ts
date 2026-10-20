import type { AppLocale } from "./config";

export const GIFT_PREFERENCE_CATEGORY_IDS = [
  "flowers", "books", "travel", "experiences", "technology", "cosmetics",
  "sweets", "jewelry", "clothes", "games", "sport", "home",
] as const;

export type GiftPreferenceCategoryId = typeof GIFT_PREFERENCE_CATEGORY_IDS[number];

export const giftPreferenceCategoryLabels: Record<AppLocale, Record<GiftPreferenceCategoryId, string>> = {
  uk: { flowers: "Квіти", books: "Книги", travel: "Подорожі", experiences: "Враження", technology: "Технології", cosmetics: "Косметика", sweets: "Солодощі", jewelry: "Прикраси", clothes: "Одяг", games: "Ігри", sport: "Спорт", home: "Для дому" },
  pl: { flowers: "Kwiaty", books: "Książki", travel: "Podróże", experiences: "Wrażenia", technology: "Technologie", cosmetics: "Kosmetyki", sweets: "Słodycze", jewelry: "Biżuteria", clothes: "Ubrania", games: "Gry", sport: "Sport", home: "Dom" },
  en: { flowers: "Flowers", books: "Books", travel: "Travel", experiences: "Experiences", technology: "Technology", cosmetics: "Cosmetics", sweets: "Sweets", jewelry: "Jewelry", clothes: "Clothing", games: "Games", sport: "Sport", home: "Home" },
  de: { flowers: "Blumen", books: "Bücher", travel: "Reisen", experiences: "Erlebnisse", technology: "Technologie", cosmetics: "Kosmetik", sweets: "Süßigkeiten", jewelry: "Schmuck", clothes: "Kleidung", games: "Spiele", sport: "Sport", home: "Für Zuhause" },
  ru: { flowers: "Цветы", books: "Книги", travel: "Путешествия", experiences: "Впечатления", technology: "Технологии", cosmetics: "Косметика", sweets: "Сладости", jewelry: "Украшения", clothes: "Одежда", games: "Игры", sport: "Спорт", home: "Для дома" },
};

const categoryIds = new Set<string>(GIFT_PREFERENCE_CATEGORY_IDS);

export function isGiftPreferenceCategoryId(value: string): value is GiftPreferenceCategoryId {
  return categoryIds.has(value);
}
export function localizeGiftPreference(value: string, locale: AppLocale): string {
  return isGiftPreferenceCategoryId(value) ? giftPreferenceCategoryLabels[locale][value] : value;
}

export function localizeGiftPreferences(values: readonly string[], locale: AppLocale): string[] {
  return values.map((value) => localizeGiftPreference(value, locale));
}

export function canonicalizeGiftPreference(value: string, locale: AppLocale): string {
  const normalized = value.trim();
  if (!normalized || isGiftPreferenceCategoryId(normalized)) return normalized;
  const entry = GIFT_PREFERENCE_CATEGORY_IDS.find((id) =>
    giftPreferenceCategoryLabels[locale][id].localeCompare(normalized, locale, { sensitivity: "accent" }) === 0
  );
  return entry ?? normalized;
}

