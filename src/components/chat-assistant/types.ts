import type { LucideIcon } from "lucide-react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "streaming" | "complete" | "error";
  errorCode?: "request_failed" | "rate_limited" | "daily_ai_budget_exceeded";
  retryAt?: number;
};

export type AssistantAction = {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: LucideIcon;
  destination?: string;
};
