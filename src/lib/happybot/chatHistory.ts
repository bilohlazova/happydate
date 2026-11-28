import type { ChatMessage } from "../../components/chat-assistant/types.ts";
import type { ChatScopeInput } from "../assistant/chatScope.contract.ts";
import type { ChatGiftRequestInput } from "../assistant/chatOwnership.ts";

/**
 * Pure rules of the unified HappyBot history (HD-CHAT-002 Phase 1C). No React, no I/O.
 *
 * Source of truth: `happy_chat_turns` (written only by the trusted server, owner-readable by RLS).
 * Segments: global / person. What storage cannot tell apart is never restored into a segment:
 * - a turn is stored with the request scope; gift chats are stored as scope "global" (with the person
 *   id when known), event/task chats under their own scope. Without an event/task/gift column
 *   (no migration in this phase) those cannot be told from a plain global chat, so
 * - global segment  = scope "global" AND no person id;
 * - person segment  = scope "person" AND that person id;
 * - gift, event and task conversations are not restored (they stay in server-side memory only).
 * History is only displayed and sent as conversation context of its OWN segment; it is never
 * written to long-term memory from here.
 */

export type StoredChatTurn = {
  id: string;
  userId: string;
  personId: string | null;
  scope: "global" | "person" | "event" | "task";
  userMessage: string;
  happyResponse: string;
  createdAt: string;
};

export type HistorySegment = { kind: "global" } | { kind: "person"; personId: string };

/** Two copies of one exchange (dual write, retry) are the same turn if they are this close in time. */
export const DUPLICATE_TURN_WINDOW_MS = 120_000;

/** Segment whose stored history may be restored into a conversation, or `null` if it cannot be confirmed. */
export function historySegmentFor(scope: ChatScopeInput | undefined, giftRequest: ChatGiftRequestInput): HistorySegment | null {
  if (giftRequest) return null;
  if (!scope || scope.type === "global") return { kind: "global" };
  if (scope.type === "person") return { kind: "person", personId: scope.personId };
  return null;
}

export function turnBelongsToSegment(turn: StoredChatTurn, segment: HistorySegment, ownerId: string): boolean {
  if (turn.userId !== ownerId) return false;
  if (segment.kind === "global") return turn.scope === "global" && turn.personId === null;
  return turn.scope === "person" && turn.personId === segment.personId;
}

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
const exchangeKey = (turn: Pick<StoredChatTurn, "personId" | "userMessage" | "happyResponse">) =>
  `${turn.personId ?? ""}\u0000${normalize(turn.userMessage)}\u0000${normalize(turn.happyResponse)}`;
const time = (turn: { createdAt: string }) => Date.parse(turn.createdAt);
const byTime = (a: StoredChatTurn, b: StoredChatTurn) => time(a) - time(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Oldest first; of copies of the same exchange within the window only the earliest is kept. */
export function dedupeTurns(turns: readonly StoredChatTurn[]): StoredChatTurn[] {
  const kept: StoredChatTurn[] = [];
  const lastKeptAt = new Map<string, number>();
  for (const turn of [...turns].sort(byTime)) {
    const key = exchangeKey(turn);
    const previous = lastKeptAt.get(key);
    if (previous !== undefined && Math.abs(time(turn) - previous) <= DUPLICATE_TURN_WINDOW_MS) continue;
    lastKeptAt.set(key, time(turn));
    kept.push(turn);
  }
  return kept;
}

/**
 * Legacy `person_happy_conversations` rows are a person-only duplicate store. Rows already present in
 * `happy_chat_turns` are dropped; older ones (before that table existed) are kept. Newest first.
 */
export function mergeLegacyTurns(primary: readonly StoredChatTurn[], legacy: readonly StoredChatTurn[]): StoredChatTurn[] {
  const merged = dedupeTurns(primary);
  for (const row of legacy) {
    const duplicate = merged.some((turn) => exchangeKey(turn) === exchangeKey(row) && Math.abs(time(turn) - time(row)) <= DUPLICATE_TURN_WINDOW_MS);
    if (!duplicate) merged.push(row);
  }
  return dedupeTurns(merged).reverse();
}

export function turnsToMessages(turns: readonly StoredChatTurn[]): ChatMessage[] {
  return turns.flatMap((turn): ChatMessage[] => [
    { id: `history-${turn.id}-user`, role: "user", content: turn.userMessage, personId: turn.personId, status: "complete" },
    { id: `history-${turn.id}-assistant`, role: "assistant", content: turn.happyResponse, personId: turn.personId, status: "complete" },
  ]);
}

/**
 * Puts restored history in front of what the user already did in this conversation. A restored exchange
 * that is also in the live messages (it was saved while the history was loading) is not shown twice.
 */
export function mergeHydratedHistory(history: readonly ChatMessage[], live: readonly ChatMessage[]): ChatMessage[] {
  const liveExchanges = new Set<string>();
  for (let index = 0; index < live.length - 1; index += 1) {
    const [user, assistant] = [live[index], live[index + 1]];
    if (user.role === "user" && assistant.role === "assistant") liveExchanges.add(`${normalize(user.content)}\u0000${normalize(assistant.content)}`);
  }
  const restored: ChatMessage[] = [];
  for (let index = 0; index < history.length; index += 2) {
    const [user, assistant] = [history[index], history[index + 1]];
    if (!user || !assistant) continue;
    if (liveExchanges.has(`${normalize(user.content)}\u0000${normalize(assistant.content)}`)) continue;
    restored.push(user, assistant);
  }
  return [...restored, ...live];
}
