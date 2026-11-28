import type { ChatScopeInput } from "../assistant/chatScope.contract.ts";
import type { ChatGiftRequestInput } from "../assistant/chatOwnership.ts";

/**
 * Pure rules for opening the one HappyBot (HD-CHAT-002 Phase 1A). No React, no I/O.
 *
 * Every entry point (home, person profile, notification deep link, legacy launch events)
 * describes WHAT it wants to open as a HappyBotOpenRequest; the provider is the only
 * place that turns it into state. Normalising here keeps every entry point on the same
 * neutral defaults (general chat, no gift request, no prompt), so nothing private from a
 * previous entry point can leak into the next one.
 */

/** Window events that existed before the provider. Both open the general chat. */
export const HAPPYBOT_LEGACY_OPEN_EVENTS = ["hd:openChat", "happydate:open-chat"] as const;

export type HappyBotGiftRequest = NonNullable<ChatGiftRequestInput>;

export type HappyBotOpenRequest = {
  scope?: ChatScopeInput;
  giftRequest?: HappyBotGiftRequest | null;
  /** Text Happy is asked straight away. It is user-initiated: only an open() call sends it. */
  initialPrompt?: string | null;
  /** Called after Happy learns something about a person (profile refresh). */
  onPersonMemoryUpdated?: (personId?: string) => void | Promise<void>;
};

export type ResolvedOpenRequest = {
  scope: ChatScopeInput;
  giftRequest: HappyBotGiftRequest | null;
  initialPrompt: string | null;
};

export function resolveOpenRequest(request?: HappyBotOpenRequest | null): ResolvedOpenRequest {
  const prompt = request?.initialPrompt;
  return {
    scope: request?.scope ?? { type: "global" },
    giftRequest: request?.giftRequest ?? null,
    initialPrompt: typeof prompt === "string" && prompt.trim() ? prompt : null,
  };
}

export function sameScope(a: ChatScopeInput | undefined, b: ChatScopeInput | undefined): boolean {
  const left = a ?? { type: "global" as const };
  const right = b ?? { type: "global" as const };
  if (left.type !== right.type) return false;
  if (left.type === "person" && right.type === "person") return left.personId === right.personId;
  if (left.type === "event" && right.type === "event") return left.eventId === right.eventId;
  if (left.type === "task" && right.type === "task") return left.taskId === right.taskId;
  return true;
}

/** Unlike the conversation context key, the gift `mode` counts here: it changes the prompt. */
export function sameGiftRequest(a: ChatGiftRequestInput, b: ChatGiftRequestInput): boolean {
  if (!a || !b) return !a && !b;
  return a.personId === b.personId && a.eventId === b.eventId && (a.mode ?? "selection") === (b.mode ?? "selection");
}
