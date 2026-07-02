import { buildInsights } from "./buildInsights";
import { getBrainMemories } from "@/lib/repositories/memoryRepository";
import type { BrainEvent, Insight } from "./types";

export interface LoadBrainParams {
  userId: string;
  profile?: unknown;
  people?: unknown[];
  events?: BrainEvent[];
  notes?: unknown[];
}

/**
 * Loads every data source required by the Brain,
 * then builds a unified list of insights.
 */
export async function loadBrain({
  userId,
  profile,
  people,
  events,
  notes,
}: LoadBrainParams): Promise<Insight[]> {
  const memories = await getBrainMemories(userId);

  return buildInsights({
    profile,
    people,
    events,
    notes,
    memories,
  });
}