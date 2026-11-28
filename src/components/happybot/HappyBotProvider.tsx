"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import UserScopedChatAssistant from "@/components/assistant/UserScopedChatAssistant";
import { HappyBotContext, type HappyBotApi } from "@/components/happybot/useHappyBot";
import { useSheetNavigation } from "@/components/happybot/useSheetNavigation";
import { useChatOwnerReset } from "@/hooks/useChatOwnerReset";
import { useHomeChatState } from "@/hooks/useHomeChatState";
import { HAPPYBOT_LEGACY_OPEN_EVENTS, resolveOpenRequest, sameGiftRequest, sameScope, type HappyBotOpenRequest } from "@/lib/happybot/openRequest";
import { useRestoreGuard } from "@/lib/privacy/useRestoreGuard";

const NOOP = () => {};

/**
 * The single owner of the HappyBot (HD-CHAT-002 Phase 1A).
 *
 * Mounted once in the root layout, inside AuthProvider. Every entry point calls
 * `useHappyBot().open(...)` instead of mounting its own chat, so there is exactly one
 * UserScopedChatAssistant (owner-scoped, per-context conversations, LRU cap, abort on
 * unmount) for the whole app. What this layer adds on top of HD-CHAT-001:
 * - one place that holds the page-level inputs (open flag, scope, gift request, prompt) and
 *   resets them on sign-out / account switch (useHomeChatState -> useChatOwnerReset);
 * - its own BFCache restore guard while the sheet is open, because it lives outside PrivateSnapshotBoundary;
 * - nothing is mounted before the first open() and everything is dropped on owner change;
 * - opening is idempotent: re-opening the same context neither remounts nor re-sends;
 * - the sheet closes on route change, as the page-local mounts did when their page unmounted;
 * - the two legacy launch events are handled here only;
 * - Back closes the open sheet (one pushed history entry) and the page scroll position is restored on close.
 * Messages are never written to web storage, and nothing here calls the AI API: only the
 * conversation itself sends a request, and only after open() carries a prompt or the user submits.
 */
export default function HappyBotProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { chatOpen, setChatOpen, chatInitialPrompt, setChatInitialPrompt, chatGiftRequest, setChatGiftRequest, chatScope, setChatScope } = useHomeChatState();
  const [mounted, setMounted] = useState(false);
  const memoryCallback = useRef<HappyBotOpenRequest["onPersonMemoryUpdated"]>(undefined);
  // Private chat content is in the DOM only while the sheet is open, so the guard runs only then. A closed
  // HappyBot adds no listener and no verification, which keeps the one-verification-per-restore rule of the pages.
  const restore = useRestoreGuard(chatOpen ? user?.id ?? null : null, NOOP);
  const privateHidden = restore.state !== null;

  useChatOwnerReset(useCallback(() => {
    setMounted(false);
    memoryCallback.current = undefined;
  }, []));

  // Close on route change (derived during render, like UserScopedChatAssistant does).
  const pathname = usePathname();
  const [seenPathname, setSeenPathname] = useState(pathname);
  if (seenPathname !== pathname) {
    setSeenPathname(pathname);
    if (chatOpen) setChatOpen(false);
  }

  const isOpen = chatOpen && !privateHidden;
  const close = useCallback(() => setChatOpen(false), [setChatOpen]);
  const { rememberScroll } = useSheetNavigation(isOpen, close);

  const open = useCallback((request?: HappyBotOpenRequest) => {
    rememberScroll();
    const next = resolveOpenRequest(request);
    memoryCallback.current = request?.onPersonMemoryUpdated;
    setChatScope((previous) => (sameScope(previous, next.scope) ? previous : next.scope));
    setChatGiftRequest((previous) => (sameGiftRequest(previous, next.giftRequest) ? previous : next.giftRequest));
    setChatInitialPrompt(next.initialPrompt);
    setMounted(true);
    setChatOpen(true);
  }, [rememberScroll, setChatGiftRequest, setChatInitialPrompt, setChatOpen, setChatScope]);

  useEffect(() => {
    const onLegacyOpen = () => open();
    for (const name of HAPPYBOT_LEGACY_OPEN_EVENTS) window.addEventListener(name, onLegacyOpen);
    return () => {
      for (const name of HAPPYBOT_LEGACY_OPEN_EVENTS) window.removeEventListener(name, onLegacyOpen);
    };
  }, [open]);

  const handlePersonMemoryUpdated = useCallback((personId?: string) => memoryCallback.current?.(personId), []);

  const api = useMemo<HappyBotApi>(() => ({ open, close, isOpen, scope: chatScope }), [open, close, isOpen, chatScope]);

  return (
    <HappyBotContext.Provider value={api}>
      {children}
      {mounted && (
        <UserScopedChatAssistant
          open={isOpen}
          onClose={close}
          onPersonMemoryUpdated={handlePersonMemoryUpdated}
          initialPrompt={chatInitialPrompt}
          autoSubmitInitialPrompt={Boolean(chatInitialPrompt)}
          giftRequest={chatGiftRequest}
          scope={chatScope}
        />
      )}
    </HappyBotContext.Provider>
  );
}
