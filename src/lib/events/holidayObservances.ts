export type HolidaySourceRecord = {
  date: string;
  name: string;
  type: string;
  rule?: string;
  substitute?: boolean;
};

export type CalendarObservanceRecord = {
  date: string;
  title: string;
  kind: "public" | "religious" | "observance";
};

type ProductLocale = "uk" | "pl" | "de" | "en" | "ru";

const RELIGIOUS_LABELS: Record<string, Record<ProductLocale, string>> = {
  epiphany: { uk: "Богоявлення", pl: "Objawienie Pańskie", de: "Heilige Drei Könige", en: "Epiphany", ru: "Крещение Господне" },
  annunciation: { uk: "Благовіщення Пресвятої Богородиці", pl: "Zwiastowanie Pańskie", de: "Verkündigung des Herrn", en: "Annunciation", ru: "Благовещение Пресвятой Богородицы" },
  palmSunday: { uk: "Вербна неділя", pl: "Niedziela Palmowa", de: "Palmsonntag", en: "Palm Sunday", ru: "Вербное воскресенье" },
  easter: { uk: "Великдень", pl: "Wielkanoc", de: "Ostersonntag", en: "Easter Sunday", ru: "Пасха" },
  ascension: { uk: "Вознесіння Господнє", pl: "Wniebowstąpienie Pańskie", de: "Christi Himmelfahrt", en: "Ascension Day", ru: "Вознесение Господне" },
  trinity: { uk: "Трійця", pl: "Zesłanie Ducha Świętego", de: "Pfingstsonntag", en: "Pentecost", ru: "Троица" },
  transfiguration: { uk: "Преображення Господнє", pl: "Przemienienie Pańskie", de: "Verklärung des Herrn", en: "Transfiguration", ru: "Преображение Господне" },
  dormition: { uk: "Успіння Пресвятої Богородиці", pl: "Wniebowzięcie Najświętszej Maryi Panny", de: "Mariä Himmelfahrt", en: "Dormition of the Mother of God", ru: "Успение Пресвятой Богородицы" },
};

const RELIGIOUS_TITLE = /christ|easter|epiphany|good friday|palm sunday|ash wednesday|holy (?:thursday|saturday)|ascension|pentecost|whit monday|corpus christi|assumption|all saints|all souls|advent|immaculate conception|annunciation|transfiguration|dormition|orthodox|\bsaint\b|\bst\.|boż(?:e|ego) narodzen|wigili|wielkan|trzech króli|popielc|palmow|wielki (?:czwartek|piątek|sobota)|zielone świątki|bożego ciała|wniebowzię|wszystkich świętych|zaduszk|adwent|mikołaj|święto chrztu|weihnacht|ostern|karfreitag|palmsonntag|aschermittwoch|gründonnerstag|himmelfahrt|pfingst|fronleichnam|allerheiligen|allerseelen|buß- und bettag|heilige drei könige|\bsankt\b|різдв|рождеств|пасх|великд|богояв|хрещ|крещ|благовіщ|благовещ|вербн|вознес|трійц|троиц|преображ|успін|успен/i;

function normalizeLocale(locale: string): ProductLocale {
  const language = locale.toLowerCase().split("-")[0];
  return language === "uk" || language === "pl" || language === "de" || language === "ru" ? language : "en";
}

function normalizeIdentity(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/\((?:substitute|observed|замінити|перенесен)[^)]*\)/giu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function dayNumber(dateYMD: string) {
  return Date.parse(`${dateYMD}T12:00:00Z`) / 86_400_000;
}

function addUtcDays(dateYMD: string, days: number) {
  const date = new Date(`${dateYMD}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function orthodoxEasterDate(year: number) {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const julianMonth = Math.floor((d + e + 114) / 31);
  const julianDay = ((d + e + 114) % 31) + 1;
  const gregorianOffset = Math.floor(year / 100) - Math.floor(year / 400) - 2;
  const date = new Date(Date.UTC(year, julianMonth - 1, julianDay + gregorianOffset, 12));
  return date.toISOString().slice(0, 10);
}

export function isReligiousHoliday(record: Pick<HolidaySourceRecord, "name" | "rule">) {
  if (RELIGIOUS_TITLE.test(record.name)) return true;
  const rule = record.rule?.toLocaleLowerCase() ?? "";
  if (/\b(?:orthodox|julian)\b/.test(rule)) return true;
  return /^easter(?:\s|$)/.test(rule) && !/mother|father|mutter|vater|matki|ojca|матер|отц|матері|батьк/i.test(record.name);
}

function easternChristianObservances(country: string, year: number, locale: string): CalendarObservanceRecord[] {
  if (country !== "UA" && country !== "RU" && country !== "BY") return [];
  const language = normalizeLocale(locale);
  const easter = orthodoxEasterDate(year);
  const revisedCalendar = country === "UA";
  const fixed = revisedCalendar
    ? [["01-06", "epiphany"], ["03-25", "annunciation"], ["08-06", "transfiguration"], ["08-15", "dormition"]]
    : [["01-19", "epiphany"], ["04-07", "annunciation"], ["08-19", "transfiguration"], ["08-28", "dormition"]];
  const dates: Array<[string, string]> = [
    ...fixed.map(([monthDay, key]) => [`${year}-${monthDay}`, key] as [string, string]),
    [addUtcDays(easter, -7), "palmSunday"],
    [easter, "easter"],
    [addUtcDays(easter, 39), "ascension"],
    [addUtcDays(easter, 49), "trinity"],
  ];
  return dates.map(([date, key]) => ({ date, title: RELIGIOUS_LABELS[key][language], kind: "religious" }));
}

export function buildCalendarObservances(
  source: HolidaySourceRecord[],
  country: string,
  year: number,
  locale: string,
) {
  const withoutSubstitutes = source
    .filter((holiday) => !holiday.substitute)
    .map((holiday): CalendarObservanceRecord & { identity: string } => ({
      date: holiday.date.slice(0, 10),
      title: holiday.name,
      kind: isReligiousHoliday(holiday)
        ? "religious"
        : holiday.type === "public" || holiday.type === "bank"
          ? "public"
          : "observance",
      identity: normalizeIdentity(holiday.name),
    }))
    .sort((left, right) => left.date.localeCompare(right.date));

  // Some country definitions expose the same holiday twice on adjacent days
  // without marking the second occurrence as a substitute. Keep the real date.
  const semanticDates = new Map<string, number>();
  const uniqueSource = withoutSubstitutes.filter((holiday) => {
    const previous = semanticDates.get(holiday.identity);
    const current = dayNumber(holiday.date);
    if (previous !== undefined && Math.abs(current - previous) <= 7) return false;
    semanticDates.set(holiday.identity, current);
    return true;
  });

  const candidates = [...uniqueSource, ...easternChristianObservances(country, year, locale).map((item) => ({ ...item, identity: normalizeIdentity(item.title) }))];
  const byDate = new Map<string, CalendarObservanceRecord & { identity: string }>();
  const priority = { observance: 1, public: 2, religious: 3 } as const;

  for (const item of candidates) {
    const existing = byDate.get(item.date);
    if (!existing || priority[item.kind] > priority[existing.kind]) byDate.set(item.date, item);
  }

  return [...byDate.values()]
    .map(({ date, title, kind }) => ({ date, title, kind }))
    .sort((left, right) => left.date.localeCompare(right.date));
}
