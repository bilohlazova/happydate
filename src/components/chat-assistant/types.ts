import type { LucideIcon } from "lucide-react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "streaming" | "complete" | "error";
  errorCode?: "request_failed" | "rate_limited";
  retryAt?: number;
};

export type AssistantAction = {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: LucideIcon;
};
