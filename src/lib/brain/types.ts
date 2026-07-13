export type InsightType =
  | "next_event"
  | "memory"
  | "preference"
  | "gift"
  | "relationship"
  | "missing_data"
  | "gift_saved"
  | "gift_suggestion_ready"
  | "missing_person_context"
  | "recent_memory";

export type InsightReason =
  | "upcoming_event_and_saved_gift"
  | "upcoming_event_and_person_context"
  | "upcoming_event_missing_context"
  | "recent_linked_memory";

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

  eventId?: string;

  reason?: InsightReason;

  metadata?: {
    sourceMemoryIds: string[];
  };

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

  /** Canonical link when the event belongs to a person. */
  personId?: string | null;
}

export interface BrainPerson {
  id: string;
  name: string;
}

/**
 * Internal Brain representation of a memory.
 * Independent from the database schema.
 */
export interface BrainMemory {
  id: string;

  personId: string | null;

  type: string | null;

  title: string | null;

  value: string | null;

  content: string | null;

  importance: number;

  occurredOn: string | null;

  createdAt: string | null;

  isActive: boolean;

  eventId: string | null;
}
