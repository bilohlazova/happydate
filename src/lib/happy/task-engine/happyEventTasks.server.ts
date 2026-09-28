import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type HappyEventTaskRow = {
  id: string;
  type: string;
  title: string;
  status: string;
  person_id: string | null;
  event_id: string | null;
  started_at: string;
};

// Event is the durable goal context. This deliberately returns only active
// work for one owner/event pair; it never falls back to another event.
export async function getHappyTasksForEvent(
  client: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<{ data: HappyEventTaskRow[]; error: unknown | null }> {
  const { data, error } = await client
    .from("happy_tasks")
    .select("id,type,title,status,person_id,event_id,started_at")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .in("status", ["active", "waiting_user", "paused"])
    .order("started_at", { ascending: false })
    .limit(10);

  return { data: (data ?? []) as HappyEventTaskRow[], error };
}
