import { PRIORITY } from "../priorities";
import type { KnowledgeItem } from "../../knowledge/index.ts";
import { consumerStoredType, consumerValue } from "../../knowledge/index.ts";
import { Insight } from "../types";

export interface MemoryEngineParams {
  memories?: KnowledgeItem[];
}

// Memory Engine owns genuine memories and notes — not structured
// preferences, which belong to the Preference Engine.
const MEMORY_TYPES = ["memory", "note", "story"] as const;

export function buildMemoryInsight({
  memories = [],
}: MemoryEngineParams): Insight | null {
  // Find the first structured memory that should appear
  // in the Care Feed.
  const memory = memories.find(
    (memory) =>
      MEMORY_TYPES.includes(
        consumerStoredType(memory) as (typeof MEMORY_TYPES)[number]
      ) &&
      memory.title?.trim() &&
      consumerValue(memory)?.trim(),
  );

  if (!memory) {
    return null;
  }

  return {
    id: `memory-${memory.id}`,
    type: "memory",
    priority: PRIORITY.DEFAULT,
    // TODO:
    // Replace emoji with unified icon system.
    icon: "💭",
    title: "Pamiętam",
    description: `${memory.title}: ${consumerValue(memory)}`,
  };
}
