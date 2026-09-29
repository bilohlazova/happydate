import { supabase } from "@/lib/supabaseClient";

export type PersonHappyStatus = { activeTaskCount: number; currentIdeaCount: number };

/** RLS-backed, owner/person-scoped counters for the compact Person Happy section. */
export async function getPersonHappyStatus(userId: string, personId: string): Promise<PersonHappyStatus> {
  const [tasks, ideas] = await Promise.all([
    supabase.from("happy_tasks").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("person_id", personId).in("status", ["waiting_user", "active", "paused"]),
    supabase.from("happy_ideas").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("person_id", personId).in("status", ["new", "shown"]),
  ]);
  if (tasks.error) throw new Error(`[personHappyStatusRepository] task count failed: ${tasks.error.message}`);
  if (ideas.error) throw new Error(`[personHappyStatusRepository] idea count failed: ${ideas.error.message}`);
  return { activeTaskCount: tasks.count ?? 0, currentIdeaCount: ideas.count ?? 0 };
}
