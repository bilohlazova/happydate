// src/components/assistant/types.ts
// Спільні типи для всіх компонентів асистента

export type AssistantState = "guest" | "calm" | "active" | "urgent";

export interface AssistantEvent {
  id: string;
  title: string;
  date: string;
  person_name?: string | null;
  relation?: string | null;
  is_important?: boolean;
  category?: string | null;
}

export interface AssistantProfile {
  firstName?: string;
  preferences?: string | null; // JSON string або plain text
  avatarUrl?: string | null;
}

// Повертає кількість днів до події (0 = сьогодні, 1 = завтра)
export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

// Визначає стан асистента на основі даних
export function resolveState(
  isLoggedIn: boolean,
  nextEvent: AssistantEvent | null
): AssistantState {
  if (!isLoggedIn) return "guest";
  if (!nextEvent) return "calm";
  const d = daysUntil(nextEvent.date);
  if (d <= 1) return "urgent";
  return "active";
}