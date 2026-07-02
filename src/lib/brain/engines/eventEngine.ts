import { BrainEvent, Insight } from "../types";
import { getDaysUntil } from "../utils/dateUtils";
import { PRIORITY } from "../priorities";

export interface EventEngineParams {
  events: BrainEvent[];
}

export function buildEventInsight({
  events,
}: EventEngineParams): Insight | null {
  if (events.length === 0) {
    return null;
  }

  const upcomingEvents = events
    .map((event) => ({
      event,
      daysUntil: getDaysUntil(event.date),
    }))
    .filter(({ daysUntil }) => daysUntil >= 0);

  if (upcomingEvents.length === 0) {
    return null;
  }

  upcomingEvents.sort((a, b) => {
    if (a.event.is_important !== b.event.is_important) {
      return a.event.is_important ? -1 : 1;
    }

    return a.daysUntil - b.daysUntil;
  });

  const { event, daysUntil } = upcomingEvents[0];

  // `message` complements `title` (the user's own event name) —
  // it should never restate "important", the title already implies that.
  let message: string;

  if (daysUntil === 0) {
    message = "To już dzisiaj.";
  } else if (daysUntil === 1) {
    message = "To już jutro.";
  } else {
    message = `Pozostało ${daysUntil} dni.`;
  }

  let priority: number = PRIORITY.DEFAULT;

  if (daysUntil === 0) {
    priority = PRIORITY.TODAY;
  } else if (daysUntil === 1) {
    priority = PRIORITY.TOMORROW;
  } else if (daysUntil <= 7) {
    priority = PRIORITY.THIS_WEEK;
  }

  return {
    id: `event-${event.id}`,
    type: "next_event",
    priority,
    // TODO:
    // Replace emoji with unified icon system.
    icon: "🎂",
    title: event.title,
    description: message,
    action: {
      label: "Pokaż wydarzenie",
      action: "/calendar",
    },
  };
}