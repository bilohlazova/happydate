import { createClient } from "@supabase/supabase-js";
import { ASSISTANT_BEHAVIOR_MANIFEST } from "./assistantBehaviorManifest";

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function savePersonHappyConversation(input: { userId: string; personId: string; userMessage: string; happyResponse: string }): Promise<void> {
  const userMessage = input.userMessage.trim().slice(0, 4000);
  const happyResponse = input.happyResponse.trim().slice(0, 8000);
  if (!userMessage || !happyResponse) return;
  const client = adminClient();
  const { data: person } = await client.from("people").select("id").eq("id", input.personId).eq("user_id", input.userId).maybeSingle();
  if (!person) return;
  const { error } = await client.from("person_happy_conversations").insert({
    user_id: input.userId, person_id: input.personId, user_message: userMessage,
    happy_response: happyResponse, behavior_version: ASSISTANT_BEHAVIOR_MANIFEST.behaviorVersion,
  });
  if (error) throw new Error(`[happyConversationHistory] save failed: ${error.message}`);
}

export async function loadPersonHappyConversationHistory(input: { userId: string; personId: string }): Promise<Array<{ id: string; userMessage: string; happyResponse: string; createdAt: string }>> {
  const { data, error } = await adminClient().from("person_happy_conversations")
    .select("id,user_message,happy_response,created_at").eq("user_id", input.userId).eq("person_id", input.personId)
    .order("created_at", { ascending: false }).limit(6);
  if (error) return [];
  return (data ?? []).map((row) => ({ id: row.id, userMessage: row.user_message, happyResponse: row.happy_response, createdAt: row.created_at }));
}
