import type { AppLocale } from "./config";

export const profileUi = {
  uk: { socialTitle: "На одній хвилі", socialLead: "А раптом хтось поруч зараз хоче того самого, що й ви?", socialDescription: "Залиште своє бажання на кілька годин — кава, прогулянка чи просто розмова. HappyDate покаже людей на одній хвилі, не розкриваючи вашу точну локацію. А що буде далі — вирішуєте тільки ви.", coffee: "Кава", walk: "Прогулянка", talk: "Поговорити", location: "Точна локація не показується", soon: "Скоро", edit: "✏️ Редагувати профіль", together: "Разом уже {duration}" },
  en: { socialTitle: "On the same wavelength", socialLead: "What if someone nearby wants the very same thing you do?", socialDescription: "Leave your wish for a few hours — coffee, a walk, or simply a conversation. HappyDate will show people on the same wavelength without revealing your exact location. What happens next is entirely up to you.", coffee: "Coffee", walk: "Walk", talk: "Talk", location: "Your exact location is never shown", soon: "Coming soon", edit: "✏️ Edit profile", together: "Together for {duration}" },
  pl: { socialTitle: "Na jednej fali", socialLead: "A może ktoś w pobliżu chce teraz dokładnie tego samego co Ty?", socialDescription: "Zostaw swoje życzenie na kilka godzin — kawa, spacer albo po prostu rozmowa. HappyDate pokaże osoby na tej samej fali, nie ujawniając dokładnej lokalizacji. To Ty zdecydujesz, co będzie dalej.", coffee: "Kawa", walk: "Spacer", talk: "Porozmawiać", location: "Dokładna lokalizacja nie jest pokazywana", soon: "Wkrótce", edit: "✏️ Edytuj profil", together: "Razem od {duration}" },
  ru: { socialTitle: "На одной волне", socialLead: "А вдруг кто-то рядом сейчас хочет того же, что и вы?", socialDescription: "Оставьте своё желание на несколько часов — кофе, прогулка или просто разговор. HappyDate покажет людей на одной волне, не раскрывая вашу точную локацию. Что будет дальше — решаете только вы.", coffee: "Кофе", walk: "Прогулка", talk: "Поговорить", location: "Точная локация не показывается", soon: "Скоро", edit: "✏️ Редактировать профиль", together: "Вместе уже {duration}" },
  de: { socialTitle: "Auf einer Wellenlänge", socialLead: "Was, wenn jemand in deiner Nähe gerade dasselbe möchte wie du?", socialDescription: "Teile deinen Wunsch für ein paar Stunden — Kaffee, einen Spaziergang oder einfach ein Gespräch. HappyDate zeigt Menschen auf derselben Wellenlänge, ohne deinen genauen Standort preiszugeben. Was danach passiert, entscheidest nur du.", coffee: "Kaffee", walk: "Spaziergang", talk: "Reden", location: "Dein genauer Standort wird nicht angezeigt", soon: "Demnächst", edit: "✏️ Profil bearbeiten", together: "Zusammen seit {duration}" },
} as const satisfies Record<AppLocale, Record<string, string>>;

export const memberSinceLabels: Record<AppLocale, string> = {
  uk: "З HappyDate з {date}", en: "With HappyDate since {date}", pl: "Z HappyDate od {date}", ru: "С HappyDate с {date}", de: "Bei HappyDate seit {date}",
};

const unitForms: Record<AppLocale, { month: [string, string, string]; year: [string, string, string] }> = {
  uk: { month: ["місяць", "місяці", "місяців"], year: ["рік", "роки", "років"] },
  ru: { month: ["месяц", "месяца", "месяцев"], year: ["год", "года", "лет"] },
  pl: { month: ["miesiąc", "miesiące", "miesięcy"], year: ["rok", "lata", "lat"] },
  en: { month: ["month", "months", "months"], year: ["year", "years", "years"] },
  de: { month: ["Monat", "Monate", "Monaten"], year: ["Jahr", "Jahre", "Jahren"] },
};

function pluralIndex(locale: AppLocale, value: number): number {
  if (locale === "uk" || locale === "ru") {
    const n10 = value % 10; const n100 = value % 100;
    if (n10 === 1 && n100 !== 11) return 0;
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return 1;
    return 2;
  }
  if (locale === "pl") {
    if (value === 1) return 0;
    const n10 = value % 10; const n100 = value % 100;
    return n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20) ? 1 : 2;
  }
  return value === 1 ? 0 : 2;
}

export function formatMembershipDuration(locale: AppLocale, months: number): string {
  const years = Math.floor(months / 12);
  if (years > 0) {
    const yearsText = `${years} ${unitForms[locale].year[pluralIndex(locale, years)]}`;
    const remainder = months % 12;
    if (!remainder) return yearsText;
    return `${yearsText} ${remainder} ${unitForms[locale].month[pluralIndex(locale, remainder)]}`;
  }
  return `${months} ${unitForms[locale].month[pluralIndex(locale, months)]}`;
}
