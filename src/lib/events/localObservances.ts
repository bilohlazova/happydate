import { formatLocalDateOnly, parseLocalDateOnly } from "@/lib/events/dateOnly";
import { orthodoxEasterDate } from "@/lib/events/holidayObservances";

export type CalendarCountry = string;

type LocaleCode = "uk" | "pl" | "de" | "en" | "ru";

export type LocalObservance = {
  country: CalendarCountry;
  countryName: string;
  title: string;
  kind: "public" | "religious" | "observance";
};

const LOCALE_COUNTRY: Record<LocaleCode, CalendarCountry> = {
  uk: "UA",
  pl: "PL",
  de: "DE",
  en: "GB",
  ru: "RU",
};

const COUNTRY_NAMES: Record<LocaleCode, Record<CalendarCountry, string>> = {
  uk: { UA: "Україна", PL: "Польща", DE: "Німеччина", GB: "Велика Британія", RU: "Росія" },
  pl: { UA: "Ukraina", PL: "Polska", DE: "Niemcy", GB: "Wielka Brytania", RU: "Rosja" },
  de: { UA: "Ukraine", PL: "Polen", DE: "Deutschland", GB: "Vereinigtes Königreich", RU: "Russland" },
  en: { UA: "Ukraine", PL: "Poland", DE: "Germany", GB: "United Kingdom", RU: "Russia" },
  ru: { UA: "Украина", PL: "Польша", DE: "Германия", GB: "Великобритания", RU: "Россия" },
};

const LABELS: Record<string, Record<LocaleCode, string>> = {
  newYear: { uk: "Новий рік", pl: "Nowy Rok", de: "Neujahr", en: "New Year’s Day", ru: "Новый год" },
  christmas: { uk: "Різдво Христове", pl: "Boże Narodzenie", de: "Erster Weihnachtstag", en: "Christmas Day", ru: "Рождество Христово" },
  christmas2: { uk: "Другий день Різдва", pl: "Drugi dzień Bożego Narodzenia", de: "Zweiter Weihnachtstag", en: "Boxing Day", ru: "Второй день Рождества" },
  easter: { uk: "Великдень", pl: "Wielkanoc", de: "Ostersonntag", en: "Easter Sunday", ru: "Пасха" },
  easterMonday: { uk: "Світлий понеділок", pl: "Poniedziałek Wielkanocny", de: "Ostermontag", en: "Easter Monday", ru: "Светлый понедельник" },
  epiphany: { uk: "Богоявлення", pl: "Święto Trzech Króli", de: "Heilige Drei Könige", en: "Epiphany", ru: "Крещение Господне" },
  labour: { uk: "День праці", pl: "Święto Pracy", de: "Tag der Arbeit", en: "Early May bank holiday", ru: "Праздник Весны и Труда" },
  victory: { uk: "День пам’яті та перемоги над нацизмом", pl: "Narodowy Dzień Zwycięstwa", de: "Tag der Befreiung", en: "Victory in Europe Day", ru: "День Победы" },
  constitution: { uk: "День Конституції України", pl: "Święto Konstytucji 3 Maja", de: "Tag des Grundgesetzes", en: "Constitution Day", ru: "День Конституции" },
  independence: { uk: "День Незалежності України", pl: "Narodowe Święto Niepodległości", de: "Unabhängigkeitstag", en: "Independence Day", ru: "День России" },
  unity: { uk: "День Соборності України", pl: "Dzień Jedności Ukrainy", de: "Tag der Einheit der Ukraine", en: "Unity Day of Ukraine", ru: "День народного единства" },
  assumption: { uk: "Успіння Пресвятої Богородиці", pl: "Wniebowzięcie Najświętszej Maryi Panny", de: "Mariä Himmelfahrt", en: "Assumption of Mary", ru: "Успение Пресвятой Богородицы" },
  allSaints: { uk: "День усіх святих", pl: "Wszystkich Świętych", de: "Allerheiligen", en: "All Saints’ Day", ru: "День всех святых" },
  germanUnity: { uk: "День німецької єдності", pl: "Dzień Jedności Niemiec", de: "Tag der Deutschen Einheit", en: "German Unity Day", ru: "День германского единства" },
  goodFriday: { uk: "Страсна п’ятниця", pl: "Wielki Piątek", de: "Karfreitag", en: "Good Friday", ru: "Страстная пятница" },
};

const FIXED: Record<CalendarCountry, Record<string, string>> = {
  UA: { "01-01": "newYear", "01-06": "epiphany", "01-22": "unity", "05-01": "labour", "05-08": "victory", "06-28": "constitution", "08-15": "assumption", "08-24": "independence", "12-25": "christmas" },
  PL: { "01-01": "newYear", "01-06": "epiphany", "05-01": "labour", "05-03": "constitution", "08-15": "assumption", "11-01": "allSaints", "11-11": "independence", "12-25": "christmas", "12-26": "christmas2" },
  DE: { "01-01": "newYear", "05-01": "labour", "10-03": "germanUnity", "12-25": "christmas", "12-26": "christmas2" },
  GB: { "01-01": "newYear", "12-25": "christmas", "12-26": "christmas2" },
  RU: { "01-01": "newYear", "01-07": "christmas", "05-01": "labour", "05-09": "victory", "06-12": "independence", "11-04": "unity" },
};

const RELIGIOUS_KEYS = new Set(["christmas", "christmas2", "easter", "easterMonday", "epiphany", "assumption", "allSaints", "goodFriday"]);

function normalizeLocale(locale: string): LocaleCode {
  const short = locale.toLowerCase().split("-")[0];
  return short === "uk" || short === "pl" || short === "de" || short === "ru" ? short : "en";
}

// Gregorian computus, valid for the years used by the application calendar.
function westernEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function shiftedDate(date: Date, days: number): string {
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  return formatLocalDateOnly(shifted);
}

export function getLocalObservance(dateYMD: string, locale: string): LocalObservance | null {
  const date = parseLocalDateOnly(dateYMD);
  if (!date) return null;
  const language = normalizeLocale(locale);
  const country = LOCALE_COUNTRY[language];
  const monthDay = dateYMD.slice(5);
  let key = FIXED[country][monthDay];

  if (!key) {
    if (country === "UA" || country === "RU") {
      if (dateYMD === orthodoxEasterDate(date.getFullYear())) key = "easter";
    } else {
      const easter = westernEaster(date.getFullYear());
      if (dateYMD === shiftedDate(easter, 0)) key = "easter";
      else if (dateYMD === shiftedDate(easter, 1)) key = "easterMonday";
      else if (dateYMD === shiftedDate(easter, -2) && (country === "DE" || country === "GB")) key = "goodFriday";
    }
  }

  if (!key) return null;
  const kind: LocalObservance["kind"] = RELIGIOUS_KEYS.has(key) ? "religious" : "public";
  return { country, countryName: COUNTRY_NAMES[language][country], title: LABELS[key][language], kind };
}

export function getCalendarCountryName(locale: string): string {
  const language = normalizeLocale(locale);
  return COUNTRY_NAMES[language][LOCALE_COUNTRY[language]];
}

export function getDefaultCalendarCountry(locale: string): string {
  return LOCALE_COUNTRY[normalizeLocale(locale)];
}
