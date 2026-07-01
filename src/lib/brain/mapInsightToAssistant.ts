import { Insight } from "./types";

export interface AssistantCardData {
  state: "calm" | "active" | "urgent";
  title: string;
  description: string;
  icon: string;
  actionLabel?: string;
  actionUrl?: string;
}

export function mapInsightToAssistant(
  insight: Insight | null,
): AssistantCardData | null {
  if (!insight) {
    return null;
  }

  return {
    state:
      insight.priority === "high"
        ? "urgent"
        : insight.priority === "medium"
        ? "active"
        : "calm",

    title: insight.title,

    description: insight.description ?? "",

    icon: insight.icon ?? "✨",

    actionLabel: insight.action?.label,

    actionUrl: insight.action?.action,
  };
}