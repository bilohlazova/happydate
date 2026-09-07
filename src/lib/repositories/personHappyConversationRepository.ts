import { supabase } from "@/lib/supabaseClient";

export interface PersonHappyConversationRow {
  id: string; user_id: string; person_id: string; user_message: string;
  happy_response: string; behavior_version: string; created_at: string;
}

export async function getPersonHappyConversations(userId: string, personId: string): Promise<PersonHappyConversationRow[]> {
  const { data, error } = await supabase.from("person_happy_conversations")
    .select("id,user_id,person_id,user_message,happy_response,behavior_version,created_at")
    .eq("user_id", userId).eq("person_id", personId).order("created_at", { ascending: false }).limit(20);
  if (error) throw new Error(`[personHappyConversationRepository] load failed: ${error.message}`);
  return (data ?? []) as PersonHappyConversationRow[];
}
