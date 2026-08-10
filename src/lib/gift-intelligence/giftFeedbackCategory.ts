import type { GiftRecommendationCategory } from "./giftIntelligence.types.ts";
import { normalizeGiftTitle } from "./giftRecommendationValidation.ts";

type CategorizedGift = Exclude<GiftRecommendationCategory, "other">;

const CATEGORY_TERMS: Record<CategorizedGift, readonly string[]> = {
  experience: ["experience", "erlebnis", "ticket", "bilet", "квиток", "билет", "concert", "koncert", "концерт", "workshop", "warsztat", "майстер", "мастер", "massage", "masaz", "масаж", "массаж", "spa"],
  book: ["book", "books", "ksiazka", "ksiazki", "книга", "книги", "книжка", "buch", "bucher", "kindle"],
  food_drink: ["coffee", "kawa", "кава", "кофе", "tea", "herbata", "чай", "wein", "wine", "wino", "вино", "chocolate", "czekolada", "шоколад", "schokolade"],
  flowers: ["flower", "flowers", "kwiat", "kwiaty", "квіт", "цвет", "blume", "blumen", "bouquet", "bukiet", "букет"],
  electronics: ["electronics", "electronic", "elektronika", "електрон", "электрон", "smartphone", "phone", "telefon", "телефон", "headphones", "sluchawki", "навуш", "науш", "tablet", "laptop", "gadget"],
  beauty: ["beauty", "cosmetic", "kosmet", "космет", "parfum", "perfume", "perfumy", "парфум", "духи", "skincare", "макіяж", "макияж"],
  home: ["home", "decor", "dekor", "дім", "дом", "кухн", "kuchnia", "kitchen", "kerze", "candle", "swieca", "свіч", "свеч"],
  fashion: ["fashion", "moda", "мода", "dress", "sukienka", "сукня", "платье", "shirt", "koszula", "сорочка", "рубашка", "bag", "torebka", "сумка", "jewelry", "bizuteria", "прикраса", "украшение"],
  subscription: ["subscription", "subskrypcja", "підписка", "подписка", "abonnement", "membership", "czlonkostwo", "членство"],
  travel: ["travel", "trip", "podroz", "wycieczka", "подорож", "поїздка", "путешествие", "поездка", "reise", "hotel", "готель", "отель"],
  hobby: ["hobby", "хобі", "хобби", "camera", "aparat", "камера", "photography", "fotografia", "фотограф", "painting", "malowanie", "малюван", "рисован", "garden", "ogrod", "сад"],
};

const CATEGORY_PRIORITY = Object.keys(CATEGORY_TERMS) as CategorizedGift[];

function tokenMatches(token: string, term: string): boolean {
  if (term.length <= 4) return token === term;
  return token === term || token.startsWith(term);
}

/** Stable multilingual classifier. Unknown and conflicting text fails to `other`. */
export function classifyGiftFeedbackCategory(value: string): GiftRecommendationCategory {
  const tokens = normalizeGiftTitle(value).split(" ").filter(Boolean);
  const scores = CATEGORY_PRIORITY.map((category) => ({
    category,
    score: CATEGORY_TERMS[category].reduce(
      (sum, term) => sum + (tokens.some((token) => tokenMatches(token, term)) ? 1 : 0),
      0,
    ),
  })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  if (!scores.length || (scores[1] && scores[1].score === scores[0].score)) return "other";
  return scores[0].category;
}
