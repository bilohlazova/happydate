import { supabase } from "@/lib/supabaseClient";
import type { ChatMessage } from "@/components/chat-assistant/types";
import { sessionMatchesOwner } from "@/lib/assistant/chatOwnership";
import { dedupeTurns, turnBelongsToSegment, turnsToMessages, type HistorySegment, type StoredChatTurn } from "@/lib/happybot/chatHistory";

/** Turns shown when a conversation is restored. The request itself still sends only the last 12 messages. */
export const CHAT_HISTORY_TURN_LIMIT = 20;

type Row = { id: string; user_id: string; person_id: string | null; scope: StoredChatTurn["scope"]; user_message: string; happy_response: string; created_at: string };

/**
 * Read-only: loads the signed-in owner's stored exchanges for ONE segment from `happy_chat_turns`
 * (owner-readable by RLS) and returns them as chat messages, oldest first. Never writes, never touches
 * memory or knowledge tables, never calls AI. Rows that are not the owner's or not in the segment are dropped.
 */
export async function loadSegmentHistory(input: { ownerId: string; segment: HistorySegment; signal?: AbortSignal }): Promise<ChatMessage[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionMatchesOwner(input.ownerId, sessionData.session?.user?.id) || !sessionData.session) return [];

  let query = supabase.from("happy_chat_turns")
    .select("id,user_id,person_id,scope,user_message,happy_response,created_at")
    .eq("user_id", input.ownerId);
  query = input.segment.kind === "global"
    ? query.eq("scope", "global").is("person_id", null)
    : query.eq("scope", "person").eq("person_id", input.segment.personId);
  query = query.order("created_at", { ascending: false }).limit(CHAT_HISTORY_TURN_LIMIT);
  if (input.signal) query = query.abortSignal(input.signal);

  const { data, error } = await query;
  if (error) throw new Error(`[happyBotHistory] load failed: ${error.message}`);
  const turns = ((data ?? []) as Row[])
    .map((row): StoredChatTurn => ({ id: row.id, userId: row.user_id, personId: row.person_id, scope: row.scope, userMessage: row.user_message, happyResponse: row.happy_response, createdAt: row.created_at }))
    .filter((turn) => turnBelongsToSegment(turn, input.segment, input.ownerId));
  return turnsToMessages(dedupeTurns(turns));
}
