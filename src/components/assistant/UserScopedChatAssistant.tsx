"use client";

import { useEffect, useRef } from "react";
import ChatAssistantModal, { type ChatAssistantModalProps } from "@/components/ChatAssistantModal";
import { useAuth } from "@/components/AuthProvider";
import { chatInstanceKey, chatOwnerKey, resolveChatOwner } from "@/lib/assistant/chatOwnership";

/**
 * The only way to mount the HappyBot modal.
 *
 * The conversation lives in the modal's React state, so it is bound to ONE owner
 * and ONE person/event/task context by giving the modal a key built from both:
 * - signing out or switching account remounts it (state, active person, gift
 *   request and in-flight stream are discarded; the stream is aborted on unmount);
 * - a token refresh keeps the same user id, so the key and the conversation stay;
 * - while auth is still resolving the owner is unknown and nothing is rendered;
 * - switching person/event/task starts a fresh conversation, so facts and budgets
 *   of one person never travel into another person's context.
 * Server-side memory is never touched here.
 */
export default function UserScopedChatAssistant(props: Omit<ChatAssistantModalProps, "ownerId">) {
  const { user, loading } = useAuth();
  const owner = resolveChatOwner({ authLoading: loading, userId: user?.id });
  const ownerKey = chatOwnerKey(owner);
  const previousOwnerKey = useRef<string | null>(null);
  const { open, onClose } = props;

  useEffect(() => {
    // The signed-in owner changed while the sheet was open: close it. The remount
    // below has already dropped the previous owner's conversation.
    if (previousOwnerKey.current !== null && ownerKey !== previousOwnerKey.current && open) onClose();
    previousOwnerKey.current = ownerKey;
  }, [ownerKey, open, onClose]);

  const key = chatInstanceKey(owner, props.scope, props.giftRequest);
  if (key === null) return null;
  return <ChatAssistantModal key={key} {...props} ownerId={owner.status === "user" ? owner.userId : null} />;
}
