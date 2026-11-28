import type { ChatScopeInput } from "./chatScope.contract.ts";

/**
 * Pure rules that tie the in-browser HappyBot conversation to the authenticated
 * owner. No React, no I/O: everything here is unit-testable.
 *
 * The chat state (messages, active person, gift request, in-flight stream) is
 * private to ONE owner. It may only live while that owner is the signed-in user,
 * and it must never be reused for another user or another person context.
 */

export type ChatOwner =
  /** Auth has not answered yet. Nothing private may be shown or sent. */
  | { status: "unknown" }
  | { status: "guest" }
  | { status: "user"; userId: string };

export function resolveChatOwner(input: { authLoading: boolean; userId: string | null | undefined }): ChatOwner {
  if (input.authLoading) return { status: "unknown" };
  return input.userId ? { status: "user", userId: input.userId } : { status: "guest" };
}

/** Stable key of the owner; `null` while the identity is unknown. */
export function chatOwnerKey(owner: ChatOwner): string | null {
  switch (owner.status) {
    case "unknown": return null;
    case "guest": return "guest";
    case "user": return `user:${owner.userId}`;
  }
}

export type ChatGiftRequestInput = { personId: string; eventId: string; mode?: "selection" | "supplementary" } | null | undefined;

/**
 * Identity of the person/event/task the conversation is about. Switching it
 * starts a new conversation, so one person's facts, budget or history can never
 * travel into another person's context. The gift `mode` is deliberately not part
 * of the key: it changes the prompt, not whose data is discussed.
 */
export function chatContextKey(scope: ChatScopeInput | undefined, giftRequest: ChatGiftRequestInput): string {
  const scopePart = !scope || scope.type === "global"
    ? "global"
    : scope.type === "person" ? `person:${scope.personId}`
    : scope.type === "event" ? `event:${scope.eventId}`
    : `task:${scope.taskId}`;
  const giftPart = giftRequest ? `gift:${giftRequest.personId}:${giftRequest.eventId}` : "gift:none";
  return `${scopePart}|${giftPart}`;
}

/** Key of one chat instance, or `null` while the owner is unknown (render nothing). */
export function chatInstanceKey(owner: ChatOwner, scope: ChatScopeInput | undefined, giftRequest: ChatGiftRequestInput): string | null {
  const ownerKey = chatOwnerKey(owner);
  return ownerKey === null ? null : `${ownerKey}|${chatContextKey(scope, giftRequest)}`;
}

/**
 * A request may be sent only if the access token that would authorise it belongs
 * to the owner this chat instance was created for. `undefined` owner = legacy
 * caller without ownership (unchecked). A missing session degrades to a guest
 * request on the server and carries no foreign identity, so it is allowed.
 */
export function sessionMatchesOwner(ownerId: string | null | undefined, sessionUserId: string | null | undefined): boolean {
  if (ownerId === undefined) return true;
  if (!sessionUserId) return true;
  return sessionUserId === ownerId;
}

/** An async result (stream chunk, completion, callback) may be applied only while all of this holds. */
export function canApplyAsyncResult(input: {
  mounted: boolean;
  aborted: boolean;
  isLatestRequest: boolean;
  ownerAtStart: string | null | undefined;
  ownerNow: string | null | undefined;
}): boolean {
  return input.mounted && !input.aborted && input.isLatestRequest && input.ownerAtStart === input.ownerNow;
}
