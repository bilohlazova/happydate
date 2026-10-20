import type { AppLocale } from "@/i18n/config";

export const occasionCountryCopy: Record<AppLocale, {
  title: string;
  description: string;
  unset: string;
  poland: string;
  saved: string;
  error: string;
}> = {
  uk: { title: "Країна локальних подій", description: "Оберіть країну, щоб Happy розпізнавав відповідні локальні події. Це не змінює мову чи часовий пояс.", unset: "Не обирати", poland: "Польща — локальні події", saved: "Збережено", error: "Не вдалося зберегти налаштування." },
  pl: { title: "Kraj lokalnych okazji", description: "Wybierz kraj, aby Happy rozpoznawał odpowiednie lokalne okazje. To nie zmienia języka ani strefy czasowej.", unset: "Nie wybierać", poland: "Polska — lokalne okazje", saved: "Zapisano", error: "Nie udało się zapisać ustawienia." },
  en: { title: "Country for local occasions", description: "Choose a country so Happy can recognize relevant local occasions. This does not change your language or time zone.", unset: "Do not choose", poland: "Poland — local occasions", saved: "Saved", error: "Could not save this setting." },
  de: { title: "Land für lokale Anlässe", description: "Wähle ein Land, damit Happy passende lokale Anlässe erkennt. Sprache und Zeitzone bleiben unverändert.", unset: "Nicht auswählen", poland: "Polen — lokale Anlässe", saved: "Gespeichert", error: "Einstellung konnte nicht gespeichert werden." },
  ru: { title: "Страна местных событий", description: "Выберите страну, чтобы Happy распознавал подходящие местные события. Это не меняет язык или часовой пояс.", unset: "Не выбирать", poland: "Польша — местные события", saved: "Сохранено", error: "Не удалось сохранить настройку." },
};
