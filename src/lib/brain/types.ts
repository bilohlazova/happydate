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

export interface BuildInsightsParams {
  profile?: unknown;
  people?: unknown[];
  events?: unknown[];
  notes?: unknown[];
  gifts?: unknown[];
}

export interface BrainEvent {
  id: string;
  title: string;
  date: string;
  is_important: boolean;
  person_name: string | null;
  category: string | null;
}