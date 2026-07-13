export type HappyCardType =
  | "reminder"
  | "memory"
  | "idea"
  | "warning";

export type HappyCardPriority = "low" | "medium" | "high";

export interface HappyCard {
  id: string;
  type: HappyCardType;
  priority: HappyCardPriority;
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  actionRoute: string;
  personId?: string;
  reason?: string;
  sourceInsightId?: string;
  sourceMemoryIds?: string[];
}
