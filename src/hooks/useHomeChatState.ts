"use client";

import { useCallback, useState } from "react";
import { useChatOwnerReset } from "@/hooks/useChatOwnerReset";
import type { ChatScopeInput } from "@/lib/assistant/chatScope";

export type HomeChatGiftRequest = { personId: string; eventId: string; mode?: "selection" | "supplementary" } | null;

/**
 * Page-level inputs of the HappyBot sheet (open flag, scope, initial prompt, gift request).
 * They are private to the signed-in owner, so they are reset to a neutral general chat on
 * sign-out or account switch (never on token refresh or the first auth resolution).
 */
export function useHomeChatState() {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | null>(null);
  const [chatGiftRequest, setChatGiftRequest] = useState<HomeChatGiftRequest>(null);
  const [chatScope, setChatScope] = useState<ChatScopeInput>({ type: "global" });

  const resetChatForOwnerChange = useCallback(() => {
    setChatOpen(false);
    setChatScope({ type: "global" });
    setChatInitialPrompt(null);
    setChatGiftRequest(null);
  }, []);
  useChatOwnerReset(resetChatForOwnerChange);

  return { chatOpen, setChatOpen, chatInitialPrompt, setChatInitialPrompt, chatGiftRequest, setChatGiftRequest, chatScope, setChatScope };
}
