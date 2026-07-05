import type { HappyRecommendation } from "@/components/people/HappyRecommendationCard";
import type { PersonSummary } from "@/lib/repositories/people";

export function buildBirthdayRecommendation(
  person: PersonSummary | undefined
): HappyRecommendation | null {
  if (!person?.birthday) {
    return null;
  }

  return {
    title: "Happy poleca dziś ✨",
    message: `${person.firstName} ma urodziny za ${getDaysUntilBirthday(
      person.birthday
    )} dni 🎂`,
    actionLabel: "Zobacz pomysły na prezent →",
    icon: "🎁",
  };
}

function getDaysUntilBirthday(birthday: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextBirthday = new Date(
    today.getFullYear(),
    birthday.getMonth(),
    birthday.getDate()
  );

  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }

  return Math.round(
    (nextBirthday.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
  );
}
