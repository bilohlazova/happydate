import Holidays from "date-holidays";
import { buildCalendarObservances } from "../../../../lib/events/holidayObservances.ts";

const COUNTRY_BY_LOCALE = { uk: "UA", pl: "PL", de: "DE", en: "GB", ru: "RU" } as const;
const COUNTRY_LANGUAGE = { UA: "uk", PL: "pl", DE: "de", GB: "en", RU: "ru" } as const;

type SupportedLocale = keyof typeof COUNTRY_BY_LOCALE;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawLocale = searchParams.get("locale")?.toLowerCase().split("-")[0] ?? "en";
  const locale: SupportedLocale = Object.hasOwn(COUNTRY_BY_LOCALE, rawLocale) ? rawLocale as SupportedLocale : "en";
  const year = Number(searchParams.get("year"));
  const holidayCatalog = new Holidays();
  const sourceCountries = holidayCatalog.getCountries(locale);
  const regionNames = new Intl.DisplayNames([locale, "en"], { type: "region" });
  const countries = Object.fromEntries(
    Object.entries(sourceCountries).map(([code, fallbackName]) => [code, regionNames.of(code) ?? fallbackName]),
  );
  const requestedCountry = searchParams.get("country")?.toUpperCase();

  if (!Number.isInteger(year) || year < 1970 || year > 2100) {
    return Response.json({ error: "Invalid calendar year." }, { status: 400 });
  }

  const country = requestedCountry && Object.hasOwn(countries, requestedCountry) ? requestedCountry : COUNTRY_BY_LOCALE[locale];
  const holidays = new Holidays(country);
  const countryLanguage = Object.hasOwn(COUNTRY_LANGUAGE, country) ? COUNTRY_LANGUAGE[country as keyof typeof COUNTRY_LANGUAGE] : locale;
  holidays.setLanguages([locale, countryLanguage, "en"]);

  const observances = buildCalendarObservances(holidays.getHolidays(year), country, year, locale);

  return Response.json(
    { country, countries, year, observances },
    { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
  );
}
