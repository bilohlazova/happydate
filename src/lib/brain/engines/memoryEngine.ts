import { PRIORITY } from "../priorities.ts";
import type { KnowledgeItem } from "../../knowledge/index.ts";
import { consumerValue } from "../../knowledge/index.ts";
import { selectBrainLegacyFallbackSource } from "../brainSemanticMemoryAdapter.ts";
import type { Insight } from "../types.ts";

export interface MemoryEngineParams {
  memories?: KnowledgeItem[];
}

export function buildMemoryInsight({
  memories = [],
}: MemoryEngineParams): Insight | null {
  const memory = selectBrainLegacyFallbackSource({
    knowledge: memories,
    sourceKind: "memory",
  });

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
