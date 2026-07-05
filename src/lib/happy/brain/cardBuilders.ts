import type { PersonSummary } from "@/lib/repositories/people";
import type { HappyCard } from "../types";

export function createBirthdayCard(
  person: PersonSummary
): HappyCard {
  return {
    id: `birthday-${person.id}`,
    type: "reminder",
    priority: "high",
    icon: "🎂",
    title: `Urodziny ${person.firstName}`,
    description: "Warto przygotować prezent wcześniej.",
    actionLabel: "Przejdź",
    actionRoute: `/people/${person.id}`,
  };
}

export function createMemoryCards(
  person: PersonSummary
): HappyCard[] {
  const favoriteThings = person.favoriteThings ?? [];

  if (favoriteThings.length === 0) {
    return [];
  }

  return [
    {
      id: `memory-${person.id}`,
      type: "memory",
      priority: "medium",
      icon: "🌷",
      title: `${person.firstName} lubi`,
      description: favoriteThings.join(", "),
      actionLabel: "Zobacz",
      actionRoute: `/people/${person.id}`,
    },
  ];
}

export function createGiftIdeaCard(
  person: PersonSummary
): HappyCard {
  return {
    id: `idea-${person.id}`,
    type: "idea",
    priority: "low",
    icon: "💡",
    title: "Mam pomysł",
    description: `Może przygotować prezent dla ${person.firstName}?`,
    actionLabel: "Sprawdź",
    actionRoute: "/gift/start",
  };
}