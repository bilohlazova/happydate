export type EventPreparationLocale = "uk" | "pl" | "en" | "de" | "ru";

type Labels = {
  back: string;
  loading: string;
  notFound: string;
  loadError: string;
  title: string;
  gift: string;
  greeting: string;
  plan: string;
  giftStatus: Record<"missing" | "ready", string>;
  greetingStatus: Record<"missing" | "ready", string>;
  planStatus: Record<"none" | "active" | "waiting_user" | "paused" | "completed", string>;
  start: string;
  starting: string;
  startError: string;
};

const labels: Record<EventPreparationLocale, Labels> = {
  uk: { back: "Назад до головної", loading: "Завантаження події…", notFound: "Подію не знайдено", loadError: "Не вдалося завантажити подію", title: "Підготовка", gift: "Подарунок", greeting: "Привітання", plan: "План", giftStatus: { missing: "Не обрано", ready: "Обрано" }, greetingStatus: { missing: "Не готове", ready: "Готове" }, planStatus: { none: "Ще не розпочато", active: "У процесі", waiting_user: "Потрібна ваша дія", paused: "Призупинено", completed: "Готово" }, start: "Допомогти підготуватися", starting: "Починаємо…", startError: "Не вдалося розпочати підготовку. Спробуйте ще раз." },
  pl: { back: "Wróć do strony głównej", loading: "Ładowanie wydarzenia…", notFound: "Nie znaleziono wydarzenia", loadError: "Nie udało się załadować wydarzenia", title: "Przygotowania", gift: "Prezent", greeting: "Życzenia", plan: "Plan", giftStatus: { missing: "Nie wybrano", ready: "Wybrano" }, greetingStatus: { missing: "Niegotowe", ready: "Gotowe" }, planStatus: { none: "Jeszcze nie rozpoczęto", active: "W toku", waiting_user: "Wymaga Twojej decyzji", paused: "Wstrzymano", completed: "Gotowe" }, start: "Pomóż mi się przygotować", starting: "Rozpoczynamy…", startError: "Nie udało się rozpocząć przygotowań. Spróbuj ponownie." },
  en: { back: "Back to home", loading: "Loading event…", notFound: "Event not found", loadError: "Could not load event", title: "Preparation", gift: "Gift", greeting: "Greeting", plan: "Plan", giftStatus: { missing: "Not selected", ready: "Selected" }, greetingStatus: { missing: "Not ready", ready: "Ready" }, planStatus: { none: "Not started", active: "In progress", waiting_user: "Needs your action", paused: "Paused", completed: "Complete" }, start: "Help me prepare", starting: "Starting…", startError: "Could not start preparation. Try again." },
  de: { back: "Zurück zur Startseite", loading: "Ereignis wird geladen…", notFound: "Ereignis nicht gefunden", loadError: "Ereignis konnte nicht geladen werden", title: "Vorbereitung", gift: "Geschenk", greeting: "Gruß", plan: "Plan", giftStatus: { missing: "Nicht ausgewählt", ready: "Ausgewählt" }, greetingStatus: { missing: "Nicht bereit", ready: "Bereit" }, planStatus: { none: "Noch nicht begonnen", active: "In Arbeit", waiting_user: "Deine Aktion ist nötig", paused: "Pausiert", completed: "Fertig" }, start: "Bei der Vorbereitung helfen", starting: "Startet…", startError: "Vorbereitung konnte nicht gestartet werden. Bitte versuche es erneut." },
  ru: { back: "Назад на главную", loading: "Загрузка события…", notFound: "Событие не найдено", loadError: "Не удалось загрузить событие", title: "Подготовка", gift: "Подарок", greeting: "Поздравление", plan: "План", giftStatus: { missing: "Не выбрано", ready: "Выбрано" }, greetingStatus: { missing: "Не готово", ready: "Готово" }, planStatus: { none: "Ещё не начато", active: "В процессе", waiting_user: "Нужно ваше действие", paused: "Приостановлено", completed: "Готово" }, start: "Помочь подготовиться", starting: "Начинаем…", startError: "Не удалось начать подготовку. Попробуйте ещё раз." },
};

export function eventPreparationLabels(locale: string): Labels {
  return labels[locale as EventPreparationLocale] ?? labels.en;
}
