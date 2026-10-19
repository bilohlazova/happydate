import type { AppLocale } from "./config";

export const pointsHistoryUi = {
  uk: { title: "Історія балів", show: "Показати історію балів", hide: "Сховати історію балів", reward: "Вітальна анкета", amount: "+100 балів", description: "Винагорода за перше завершення анкети", empty: "Підтверджених операцій поки немає" },
  pl: { title: "Historia punktów", show: "Pokaż historię punktów", hide: "Ukryj historię punktów", reward: "Ankieta powitalna", amount: "+100 punktów", description: "Nagroda za pierwsze ukończenie ankiety", empty: "Brak potwierdzonych operacji" },
  en: { title: "Points history", show: "Show points history", hide: "Hide points history", reward: "Welcome survey", amount: "+100 points", description: "Reward for completing the survey for the first time", empty: "No confirmed transactions yet" },
  de: { title: "Punkteverlauf", show: "Punkteverlauf anzeigen", hide: "Punkteverlauf ausblenden", reward: "Willkommensfragebogen", amount: "+100 Punkte", description: "Belohnung für den erstmaligen Abschluss des Fragebogens", empty: "Noch keine bestätigten Vorgänge" },
  ru: { title: "История баллов", show: "Показать историю баллов", hide: "Скрыть историю баллов", reward: "Приветственная анкета", amount: "+100 баллов", description: "Награда за первое завершение анкеты", empty: "Подтверждённых операций пока нет" },
} as const satisfies Record<AppLocale, Record<string, string>>;
