import type { AppLocale } from "../../i18n/config.ts";

type SemanticLabels = Record<string, string>;

// Presentation-only copy for canonical domain identifiers. Stored values stay
// unchanged; implementation-shaped keys must never be shown to the user.
const labelsByLocale: Record<AppLocale, SemanticLabels> = {
  uk: { like: "Подобається", dislike: "Не подобається", important_fact: "Важливі факти", personal_fact: "Особистий факт", interest: "Інтерес", hobby: "Хобі", favorite: "Улюблене", wish: "Побажання", experience: "Спогад", gift_idea: "Ідея подарунка", brand: "Бренд", favorite_color: "Улюблений колір", favorite_food: "Улюблена їжа", clothing_size: "Розмір одягу", sport: "Спорт", vehicle: "Транспорт", technology: "Технології", book: "Книги", movie: "Фільми", music: "Музика", travel: "Подорожі", pet: "Домашні улюбленці", collection: "Колекція", profession: "Професія", family: "Родина", lifestyle: "Стиль життя", previous_gift: "Попередній подарунок", gift_failure: "Невдалий подарунок", preferred_style: "Улюблений стиль", wishlist: "Список бажань", memory: "Спогад", preference: "Уподобання", profile_note: "Нотатка профілю" },
  pl: { like: "Lubi", dislike: "Nie lubi", important_fact: "Ważne fakty", personal_fact: "Fakt osobisty", interest: "Zainteresowanie", hobby: "Hobby", favorite: "Ulubione", wish: "Życzenie", experience: "Wspomnienie", gift_idea: "Pomysł na prezent", brand: "Marka", favorite_color: "Ulubiony kolor", favorite_food: "Ulubione jedzenie", clothing_size: "Rozmiar ubrania", sport: "Sport", vehicle: "Pojazd", technology: "Technologia", book: "Książki", movie: "Filmy", music: "Muzyka", travel: "Podróże", pet: "Zwierzęta", collection: "Kolekcja", profession: "Zawód", family: "Rodzina", lifestyle: "Styl życia", previous_gift: "Poprzedni prezent", gift_failure: "Nietrafiony prezent", preferred_style: "Preferowany styl", wishlist: "Lista życzeń", memory: "Wspomnienie", preference: "Preferencja", profile_note: "Notatka profilu" },
  en: { like: "Likes", dislike: "Dislikes", important_fact: "Important facts", personal_fact: "Personal fact", interest: "Interest", hobby: "Hobby", favorite: "Favorite", wish: "Wish", experience: "Memory", gift_idea: "Gift idea", brand: "Brand", favorite_color: "Favorite color", favorite_food: "Favorite food", clothing_size: "Clothing size", sport: "Sport", vehicle: "Vehicle", technology: "Technology", book: "Books", movie: "Movies", music: "Music", travel: "Travel", pet: "Pets", collection: "Collection", profession: "Profession", family: "Family", lifestyle: "Lifestyle", previous_gift: "Previous gift", gift_failure: "Unsuccessful gift", preferred_style: "Preferred style", wishlist: "Wish list", memory: "Memory", preference: "Preference", profile_note: "Profile note" },
  de: { like: "Mag", dislike: "Mag nicht", important_fact: "Wichtige Fakten", personal_fact: "Persönliche Tatsache", interest: "Interesse", hobby: "Hobby", favorite: "Favorit", wish: "Wunsch", experience: "Erinnerung", gift_idea: "Geschenkidee", brand: "Marke", favorite_color: "Lieblingsfarbe", favorite_food: "Lieblingsessen", clothing_size: "Kleidergröße", sport: "Sport", vehicle: "Fahrzeug", technology: "Technologie", book: "Bücher", movie: "Filme", music: "Musik", travel: "Reisen", pet: "Haustiere", collection: "Sammlung", profession: "Beruf", family: "Familie", lifestyle: "Lebensstil", previous_gift: "Früheres Geschenk", gift_failure: "Unpassendes Geschenk", preferred_style: "Bevorzugter Stil", wishlist: "Wunschliste", memory: "Erinnerung", preference: "Vorliebe", profile_note: "Profilnotiz" },
  ru: { like: "Нравится", dislike: "Не нравится", important_fact: "Важные факты", personal_fact: "Личный факт", interest: "Интерес", hobby: "Хобби", favorite: "Любимое", wish: "Пожелание", experience: "Воспоминание", gift_idea: "Идея подарка", brand: "Бренд", favorite_color: "Любимый цвет", favorite_food: "Любимая еда", clothing_size: "Размер одежды", sport: "Спорт", vehicle: "Транспорт", technology: "Технологии", book: "Книги", movie: "Фильмы", music: "Музыка", travel: "Путешествия", pet: "Домашние животные", collection: "Коллекция", profession: "Профессия", family: "Семья", lifestyle: "Образ жизни", previous_gift: "Предыдущий подарок", gift_failure: "Неудачный подарок", preferred_style: "Предпочитаемый стиль", wishlist: "Список желаний", memory: "Воспоминание", preference: "Предпочтение", profile_note: "Заметка профиля" },
};

const INTERNAL_SNAKE_CASE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/;

export function formatMemorySemanticLabel(value: unknown, locale: AppLocale): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  const key = trimmed.toLowerCase();
  return labelsByLocale[locale][key] ?? (INTERNAL_SNAKE_CASE.test(key) ? null : trimmed);
}

export function formatMemorySemanticLabels(values: readonly string[], locale: AppLocale): string[] {
  return values.flatMap((value) => {
    const label = formatMemorySemanticLabel(value, locale);
    return label ? [label] : [];
  });
}
