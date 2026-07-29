import { PRIORITY } from "../priorities.ts";
import type { KnowledgeItem } from "../../knowledge/index.ts";
import { consumerValue } from "../../knowledge/index.ts";
import { selectBrainLegacyFallbackSource } from "../brainSemanticMemoryAdapter.ts";
import type { Insight } from "../types.ts";

export interface PreferenceEngineParams {
  memories?: KnowledgeItem[];
}

export function buildPreferenceInsight({
  memories = [],
}: PreferenceEngineParams): Insight | null {
  const preference = selectBrainLegacyFallbackSource({
    knowledge: memories,
    sourceKind: "preference",
  });

  if (!preference) {
    return null;
  }

  return {
    id: `preference-${preference.id}`,
    type: "preference",
    // Preferences are informational, not a reminder — lower priority
    // than anything time-sensitive like an upcoming event.
    priority: PRIORITY.INFO,
    // TODO:
    // Replace emoji with unified icon system.
    icon: "⭐",
    title: "Preferencje",
    description: `${preference.title}: ${consumerValue(preference)}`,
  };
}
