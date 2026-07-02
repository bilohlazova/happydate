import { PRIORITY } from "../priorities";
import { BrainMemory, Insight } from "../types";

export interface PreferenceEngineParams {
  memories?: BrainMemory[];
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
        memory.type as (typeof PREFERENCE_TYPES)[number]
      ) &&
      memory.title?.trim() &&
      memory.value?.trim(),
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
    description: `${preference.title}: ${preference.value}`,
  };
}