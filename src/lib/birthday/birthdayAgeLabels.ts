export function birthdayAgeLabels(locale: string) {
  const labels = {
    uk: { birthYear: "Рік народження", currentAge: "Поточний вік", unknown: "Не знаєте року? Вкажіть вік", possible: "Можливий рік народження", add: (year: number) => `Додати ${year}`, notNow: "Не зараз", needsDate: "Для точного розрахунку потрібні день і місяць народження." },
    pl: { birthYear: "Rok urodzenia", currentAge: "Obecny wiek", unknown: "Nie znasz roku? Podaj wiek", possible: "Możliwy rok urodzenia", add: (year: number) => `Dodaj ${year}`, notNow: "Nie teraz", needsDate: "Do dokładnego obliczenia potrzebny jest dzień i miesiąc urodzenia." },
    en: { birthYear: "Birth year", currentAge: "Current age", unknown: "Don't know the year? Enter age", possible: "Possible birth year", add: (year: number) => `Add ${year}`, notNow: "Not now", needsDate: "A birthday day and month are needed for an exact calculation." },
    de: { birthYear: "Geburtsjahr", currentAge: "Aktuelles Alter", unknown: "Jahr unbekannt? Alter eingeben", possible: "Mögliches Geburtsjahr", add: (year: number) => `${year} hinzufügen`, notNow: "Nicht jetzt", needsDate: "Für eine genaue Berechnung werden Tag und Monat benötigt." },
    ru: { birthYear: "Год рождения", currentAge: "Текущий возраст", unknown: "Не знаете год? Укажите возраст", possible: "Возможный год рождения", add: (year: number) => `Добавить ${year}`, notNow: "Не сейчас", needsDate: "Для точного расчёта нужны день и месяц рождения." },
  };
  return labels[locale as keyof typeof labels] ?? labels.en;
}
