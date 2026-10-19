import type { AppLocale } from "./config";

export const pointsHistoryUi = {
  uk: { title: "Історія балів", reward: "Вітальна анкета", amount: "+100 балів", description: "Винагорода за перше завершення анкети", empty: "Підтверджених операцій поки немає" },
  pl: { title: "Historia punktów", reward: "Ankieta powitalna", amount: "+100 punktów", description: "Nagroda za pierwsze ukończenie ankiety", empty: "Brak potwierdzonych operacji" },
  en: { title: "Points history", reward: "Welcome survey", amount: "+100 points", description: "Reward for completing the survey for the first time", empty: "No confirmed transactions yet" },
  de: { title: "Punkteverlauf", reward: "Willkommensfragebogen", amount: "+100 Punkte", description: "Belohnung für den erstmaligen Abschluss des Fragebogens", empty: "Noch keine bestätigten Vorgänge" },
  ru: { title: "История баллов", reward: "Приветственная анкета", amount: "+100 баллов", description: "Награда за первое завершение анкеты", empty: "Подтверждённых операций пока нет" },
} as const satisfies Record<AppLocale, Record<string, string>>;
