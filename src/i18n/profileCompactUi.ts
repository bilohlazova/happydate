import type { AppLocale } from "./config";

export const profileCompactUi = {
  uk: { social: "Знаходь компанію для кави, прогулянки чи розмови — за спільними бажаннями й лише за згодою.", privacy: "Локація та обмін контактами — тільки за взаємною згодою." },
  pl: { social: "Znajdź towarzystwo na kawę, spacer lub rozmowę — według wspólnych planów i tylko za zgodą.", privacy: "Lokalizacja i wymiana kontaktów — tylko za obopólną zgodą." },
  en: { social: "Find company for coffee, a walk, or a chat — through shared plans and only with consent.", privacy: "Location and contact sharing are used only by mutual consent." },
  de: { social: "Finde Gesellschaft für Kaffee, einen Spaziergang oder ein Gespräch — nach gemeinsamen Plänen und nur mit Zustimmung.", privacy: "Standort und Kontaktaustausch erfolgen nur mit gegenseitiger Zustimmung." },
  ru: { social: "Находи компанию для кофе, прогулки или разговора — по общим желаниям и только с согласия.", privacy: "Локация и обмен контактами — только по взаимному согласию." },
} as const satisfies Record<AppLocale, Record<string, string>>;
