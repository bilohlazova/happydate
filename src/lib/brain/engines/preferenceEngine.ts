import { PRIORITY } from "../priorities";
import type { KnowledgeItem } from "../../knowledge/index.ts";
import { consumerStoredType, consumerValue } from "../../knowledge/index.ts";
import { Insight } from "../types";

export interface PreferenceEngineParams {
  memories?: KnowledgeItem[];
}

const PREFERENCE_TYPES = [
  "flower",
  "coffee",
  "restaurant",
  "food",
  "movie",
  "book",
  "music",
  "perfume",
  "hobby",
] as const;

export function buildPreferenceInsight({
  memories = [],
}: PreferenceEngineParams): Insight | null {
  // Find the first structured preference.
  const preference = memories.find(
    (memory) =>
      PREFERENCE_TYPES.includes(
        consumerStoredType(memory) as (typeof PREFERENCE_TYPES)[number]
      ) &&
      memory.title?.trim() &&
      consumerValue(memory)?.trim(),
  );

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
