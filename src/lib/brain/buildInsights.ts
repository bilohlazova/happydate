import { getNextImportantEvent } from "./engines/eventEngine";
import { BrainEvent, Insight } from "./types";

export interface BuildInsightsParams {
  profile?: unknown;
  people?: unknown[];
  events?: BrainEvent[];
  notes?: unknown[];
}

export function buildInsights({
  events = [],
}: BuildInsightsParams): Insight[] {
  const insights: Insight[] = [];

  const nextEvent = getNextImportantEvent({
    events,
  });

  if (nextEvent) {
    insights.push(nextEvent);
  }

  return insights;
}