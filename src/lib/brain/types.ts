export type InsightType =
  | "next_event"
  | "memory"
  | "preference"
  | "gift"
  | "relationship"
  | "missing_data";

export interface InsightAction {
  label: string;
  action: string;
}

/**
 * Unified model returned by Brain analyzers
 * and rendered in the Care Feed.
 */
export interface Insight {
  id: string;

  type: InsightType;

  priority: number;

  icon: string;

  title: string;

  description?: string;

  personId?: string;

  action?: InsightAction;
}

export interface BrainEvent {
  id: string;
  title: string;
  date: string;
  is_important: boolean;
  // TODO:
  // Replace with personId + personName once Repository/Mapper
  // resolve events by person ID instead of a denormalized name.
  person_name: string | null;
  category: string | null;
}

/**
 * Internal Brain representation of a memory.
 * Independent from the database schema.
 */
export interface BrainMemory {
  id: string;

  personId: string | null;

  type: string;

  title: string | null;

  value: string | null;

  content: string | null;

  importance: number;

  occurredOn: string | null;
}