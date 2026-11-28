"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChatAssistantModal, { type ChatAssistantModalProps } from "@/components/ChatAssistantModal";
import { useAuth } from "@/components/AuthProvider";
import { chatContextKey, chatOwnerKey, resolveChatOwner } from "@/lib/assistant/chatOwnership";
import {
  activateConversation,
  reportConversationActivity,
  resetConversationCache,
  type ConversationCache,
} from "@/lib/assistant/chatConversationCache";

/**
 * The only way to mount the HappyBot modal.
 *
 * A conversation lives in a modal instance's React state, so each instance is bound
 * to ONE owner and ONE person/event/task context:
 * - signing out or switching account drops every kept instance (state, active person,
 *   gift request and in-flight streams are discarded; streams abort on unmount);
 * - a token refresh keeps the same user id, so nothing is dropped;
 * - while auth is still resolving the owner is unknown and nothing is rendered;
 * - switching person/event/task shows that context's own conversation (kept hidden
 *   while another context is active, so going back restores it) and never feeds one
 *   person's facts or budgets into another person's request.
 * At most MAX_KEPT_CONVERSATIONS contexts are kept, least-recently-used first out
 * (see chatConversationCache.ts). This is a temporary client-side isolation, not a
 * shared history. Server-side memory is never touched here.
 */
export default function UserScopedChatAssistant(props: Omit<ChatAssistantModalProps, "ownerId">) {
  const { user, loading } = useAuth();
  const owner = resolveChatOwner({ authLoading: loading, userId: user?.id });
  const ownerKey = chatOwnerKey(owner);
  const previousOwnerKey = useRef<string | null>(null);
  const { open, onClose } = props;
  const contextKey = chatContextKey(props.scope, props.giftRequest);

  const [cache, setCache] = useState<ConversationCache>(() => resetConversationCache());
  // Derived state, adjusted during render so no instance of another owner is ever rendered.
  let current = cache;
  if (ownerKey === null) {
    if (cache.ownerKey !== null) current = resetConversationCache();
  } else if (cache.ownerKey !== ownerKey) {
    current = activateConversation(resetConversationCache(ownerKey), { contextKey, scope: props.scope, giftRequest: props.giftRequest });
  } else if (cache.activeKey !== contextKey) {
    current = activateConversation(cache, { contextKey, scope: props.scope, giftRequest: props.giftRequest });
  }
  if (current !== cache) setCache(current);

  useEffect(() => {
    // The signed-in owner changed while the sheet was open: close it. The instances of
    // the previous owner are already gone.
    if (previousOwnerKey.current !== null && ownerKey !== previousOwnerKey.current && open) onClose();
    previousOwnerKey.current = ownerKey;
  }, [ownerKey, open, onClose]);

  const reportActivity = useCallback((reportOwnerKey: string | null, key: string, activity: { busy: boolean; hasMessages: boolean }) => {
    // Ignore late reports from instances of a previous owner.
    setCache((previous) => (previous.ownerKey === reportOwnerKey ? reportConversationActivity(previous, key, activity) : previous));
  }, []);

  if (ownerKey === null) return null;
  const ownerId = owner.status === "user" ? owner.userId : null;
  return (
    <>
      {current.entries.map((entry) => {
        const active = entry.contextKey === contextKey;
        return (
          <ChatAssistantModal
            key={`${ownerKey}|${entry.contextKey}`}
            {...props}
            scope={active ? props.scope : entry.scope}
            giftRequest={active ? props.giftRequest : entry.giftRequest}
            open={open && active}
            initialPrompt={active ? props.initialPrompt : null}
            autoSubmitInitialPrompt={active ? props.autoSubmitInitialPrompt : false}
            ownerId={ownerId}
            onActivityChange={(activity) => reportActivity(ownerKey, entry.contextKey, activity)}
          />
        );
      })}
    </>
  );
}
