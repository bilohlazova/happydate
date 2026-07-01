import { BrainEvent, Insight } from "../types";
import { getDaysUntil } from "../utils/dateUtils";

export interface EventEngineParams {
  events: BrainEvent[];
}

export function getNextImportantEvent({
  events,
}: EventEngineParams): Insight | null {
  if (events.length === 0) {
    return null;
  }

  const sortedEvents = [...events].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const nextEvent = sortedEvents[0];

  const daysUntil = getDaysUntil(nextEvent.date);

  let description: string;

  if (daysUntil === 0) {
    description = "Dzisiaj";
  } else if (daysUntil === 1) {
    description = "Jutro";
  } else {
    description = `Za ${daysUntil} dni`;
  }

  return {
    id: `event-${nextEvent.id}`,
    type: "next_event",
    priority: 100,
    icon: "🎂",
    title: nextEvent.title,
    description,
    personId: undefined,
    action: {
      label: "Pokaż",
      action: "/calendar",
    },
  };
}