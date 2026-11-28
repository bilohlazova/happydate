import { supabase } from "@/lib/supabaseClient";
import { mergeLegacyTurns, type StoredChatTurn } from "@/lib/happybot/chatHistory";

export interface PersonHappyConversationRow {
  id: string; user_id: string; person_id: string; user_message: string;
  happy_response: string; behavior_version: string; created_at: string;
}

const COLUMNS = "id,user_id,person_id,user_message,happy_response,behavior_version,created_at";
const toTurn = (row: PersonHappyConversationRow, scope: StoredChatTurn["scope"]): StoredChatTurn => ({
  id: row.id, userId: row.user_id, personId: row.person_id, scope, userMessage: row.user_message, happyResponse: row.happy_response, createdAt: row.created_at,
});

/**
 * Conversation history of one person for the profile. `happy_chat_turns` is the primary source; the legacy
 * `person_happy_conversations` (a person-only duplicate that is still dual-written) only adds rows that are not
 * already there, so the same exchange is never listed twice. Newest first. A failing `happy_chat_turns` read
 * falls back to the legacy table alone; a failing legacy read still fails as before.
 */
export async function getPersonHappyConversations(userId: string, personId: string): Promise<PersonHappyConversationRow[]> {
  const [legacy, primary] = await Promise.all([
    supabase.from("person_happy_conversations").select(COLUMNS)
      .eq("user_id", userId).eq("person_id", personId).order("created_at", { ascending: false }).limit(20),
    supabase.from("happy_chat_turns").select(COLUMNS)
      .eq("user_id", userId).eq("person_id", personId).order("created_at", { ascending: false }).limit(20),
  ]);
  if (legacy.error) throw new Error(`[personHappyConversationRepository] load failed: ${legacy.error.message}`);
  const legacyRows = (legacy.data ?? []) as PersonHappyConversationRow[];
  const primaryRows = primary.error ? [] : (primary.data ?? []) as PersonHappyConversationRow[];
  if (!primaryRows.length) return legacyRows;

  const byId = new Map([...legacyRows, ...primaryRows].map((row) => [row.id, row]));
  const merged = mergeLegacyTurns(primaryRows.map((row) => toTurn(row, "person")), legacyRows.map((row) => toTurn(row, "person")));
  return merged.slice(0, 20).map((turn) => byId.get(turn.id)).filter((row): row is PersonHappyConversationRow => Boolean(row));
}
