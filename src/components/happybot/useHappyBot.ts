"use client";

import { createContext, useContext } from "react";
import type { ChatScopeInput } from "@/lib/assistant/chatScope.contract";
import type { HappyBotOpenRequest } from "@/lib/happybot/openRequest";

export type HappyBotApi = {
  /** Opens the one HappyBot in the requested context. Idempotent while that context is already open. */
  open: (request?: HappyBotOpenRequest) => void;
  /** Closes the sheet. A running answer is cancelled; the kept conversation stays. */
  close: () => void;
  /** True while the sheet is shown (never true while the private view is hidden or unverified). */
  isOpen: boolean;
  scope: ChatScopeInput;
};

export const HappyBotContext = createContext<HappyBotApi | null>(null);

export function useHappyBot(): HappyBotApi {
  const api = useContext(HappyBotContext);
  if (!api) throw new Error("useHappyBot must be used inside <HappyBotProvider>");
  return api;
}
