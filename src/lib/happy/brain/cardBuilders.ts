import type { PersonSummary } from "@/lib/repositories/people";
import type { EventSummary } from "@/lib/repositories/events";
import type { HappyCard } from "../types";

function formatCardDate(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
  }).format(date);
}

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
    title: "Pomysł na prezent",
    description: `Może przygotować prezent dla ${person.firstName}?`,
    actionLabel: "Sprawdź",
    actionRoute: "/gift/start",
  };
}

export function createEventCard(
  event: EventSummary
): HappyCard {
  return {
    id: `event-${event.id}`,
    type: "reminder",
    priority: "medium",
    icon: "📅",
    title: event.title,
    description: formatCardDate(event.date),
    actionLabel: "Pokaż",
    actionRoute: "/dashboard",
  };
}
