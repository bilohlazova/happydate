"use client";

import { useEffect, useRef, useState } from "react";
import ChatAssistantModal, { type ChatAssistantModalProps } from "@/components/ChatAssistantModal";
import { useAuth } from "@/components/AuthProvider";
import { chatContextKey, chatOwnerKey, resolveChatOwner } from "@/lib/assistant/chatOwnership";

/** Conversations kept per owner (one per person/event/task/gift context). Oldest is dropped first. */
export const MAX_KEPT_CONVERSATIONS = 6;

type KeptConversation = {
  contextKey: string;
  scope: ChatAssistantModalProps["scope"];
  giftRequest: ChatAssistantModalProps["giftRequest"];
};

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
 *   while another context is active, so going back restores it), and never feeds one
 *   person's facts or budgets into another person's request.
 * Server-side memory is never touched here.
 */
export default function UserScopedChatAssistant(props: Omit<ChatAssistantModalProps, "ownerId">) {
  const { user, loading } = useAuth();
  const owner = resolveChatOwner({ authLoading: loading, userId: user?.id });
  const ownerKey = chatOwnerKey(owner);
  const previousOwnerKey = useRef<string | null>(null);
  const { open, onClose } = props;
  const contextKey = chatContextKey(props.scope, props.giftRequest);

  const [kept, setKept] = useState<{ ownerKey: string | null; items: KeptConversation[] }>({ ownerKey: null, items: [] });
  // Derived state, adjusted during render so no instance of another owner is ever rendered.
  let items = kept.items;
  if (ownerKey === null) {
    items = [];
  } else if (kept.ownerKey !== ownerKey) {
    items = [{ contextKey, scope: props.scope, giftRequest: props.giftRequest }];
    setKept({ ownerKey, items });
  } else if (!items.some((item) => item.contextKey === contextKey)) {
    items = [...items, { contextKey, scope: props.scope, giftRequest: props.giftRequest }].slice(-MAX_KEPT_CONVERSATIONS);
    setKept({ ownerKey, items });
  }

  useEffect(() => {
    // The signed-in owner changed while the sheet was open: close it. The instances of
    // the previous owner are already gone.
    if (previousOwnerKey.current !== null && ownerKey !== previousOwnerKey.current && open) onClose();
    previousOwnerKey.current = ownerKey;
  }, [ownerKey, open, onClose]);

  if (ownerKey === null) return null;
  const ownerId = owner.status === "user" ? owner.userId : null;
  return (
    <>
      {items.map((item) => {
        const active = item.contextKey === contextKey;
        return (
          <ChatAssistantModal
            key={`${ownerKey}|${item.contextKey}`}
            {...props}
            scope={active ? props.scope : item.scope}
            giftRequest={active ? props.giftRequest : item.giftRequest}
            open={open && active}
            initialPrompt={active ? props.initialPrompt : null}
            autoSubmitInitialPrompt={active ? props.autoSubmitInitialPrompt : false}
            ownerId={ownerId}
          />
        );
      })}
    </>
  );
}
