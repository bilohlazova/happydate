import { buildEventInsight } from "./engines/eventEngine";
import { buildMemoryInsight } from "./engines/memoryEngine";
import { buildPreferenceInsight } from "./engines/preferenceEngine";
import { selectInsights } from "./selectInsights";
import {
  BrainEvent,
  BrainMemory,
  Insight,
} from "./types";

export interface BuildInsightsParams {
  profile?: unknown;
  people?: unknown[];
  events?: BrainEvent[];
  notes?: unknown[];
  memories?: BrainMemory[];
}

export function buildInsights({
  events = [],
  memories = [],
}: BuildInsightsParams): Insight[] {
  const insights: Insight[] = [];

  // Event Engine
  const eventInsight = buildEventInsight({
    events,
  });

  if (eventInsight) {
    insights.push(eventInsight);
  }

  // Memory Engine
  const memoryInsight = buildMemoryInsight({
    memories,
  });

  if (memoryInsight) {
    insights.push(memoryInsight);
  }

  // Preference Engine
  const preferenceInsight = buildPreferenceInsight({
    memories,
  });

  if (preferenceInsight) {
    insights.push(preferenceInsight);
  }

  // Future engines:
  // - Relationship Engine
  // - Gift Engine

  // Select and order insights for the Care Feed
  return selectInsights(insights);
}