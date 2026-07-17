import { buildEventInsight, type EventEngineParams } from "./engines/eventEngine";
import { buildMemoryInsight } from "./engines/memoryEngine";
import {
  buildMemoryInsightForPerson,
  getMemoryInsightEventDaysUntil,
} from "./engines/memoryInsightEngine";
import { buildPreferenceInsight } from "./engines/preferenceEngine";
import { selectInsights } from "./selectInsights";
import {
  BrainEvent,
  BrainMemory,
  BrainPerson,
  Insight,
} from "./types";

export interface BuildInsightsParams {
  profile?: unknown;
  people?: BrainPerson[];
  events?: BrainEvent[];
  notes?: unknown[];
  memories?: BrainMemory[];
  currentDate?: Date;
  eventTranslate?: EventEngineParams["translate"];
}

function eventBelongsToPerson(event: BrainEvent, person: BrainPerson): boolean {
  return (
    event.personId === person.id ||
    event.id === `birthday-${person.id}` ||
    event.person_name?.trim().toLocaleLowerCase() ===
      person.name.trim().toLocaleLowerCase()
  );
}

function eventTimestamp(event: BrainEvent): number {
  const value = new Date(event.date).getTime();
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

export function buildInsights({
  people = [],
  events = [],
  memories = [],
  currentDate = new Date(),
  eventTranslate,
}: BuildInsightsParams): Insight[] {
  const insights: Insight[] = [];

  // Event Engine
  const eventInsight = buildEventInsight({
    events,
    currentDate,
    translate: eventTranslate,
  });

  if (eventInsight) {
    insights.push(eventInsight);
  }

  if (people.length > 0) {
    // Structured Memory Insight Engine: at most one recommendation per person.
    for (const person of people) {
      const [event] = events
        .filter(
          (candidate) =>
            eventBelongsToPerson(candidate, person) &&
            getMemoryInsightEventDaysUntil(candidate, currentDate) !== null,
        )
        .sort((first, second) => eventTimestamp(first) - eventTimestamp(second));
      const memoryInsight = buildMemoryInsightForPerson({
        person,
        event,
        memories,
        currentDate,
      });

      if (memoryInsight) insights.push(memoryInsight);
    }
  } else {
    // Backward compatibility for callers that do not yet provide people.
    const memoryInsight = buildMemoryInsight({ memories });
    if (memoryInsight) insights.push(memoryInsight);

    const preferenceInsight = buildPreferenceInsight({ memories });
    if (preferenceInsight) insights.push(preferenceInsight);
  }

  // Future engines:
  // - Relationship Engine

  // Select and order insights for the Care Feed
  return selectInsights(insights);
}
