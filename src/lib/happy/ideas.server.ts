import "server-only";
import { createClient } from "@supabase/supabase-js";
import { readSupabasePublicConfig } from "@/lib/supabase/publicConfig";

export type IdeaResponseResult = { kind: "ok"; idea: { id: string; status: "accepted" | "dismissed"; respondedAt: string | null }; idempotent: boolean } | { kind: "not_found" | "conflict" | "unavailable" | "error" };

function admin() {
  const config = readSupabasePublicConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !key) return null;
  return createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export async function respondToHappyIdea(userId: string, ideaId: string, target: "accepted" | "dismissed"): Promise<IdeaResponseResult> {
  const client = admin();
  if (!client) return { kind: "unavailable" };
  const { data, error } = await client.from("happy_ideas").update({ status: target, responded_at: new Date().toISOString() }).eq("id", ideaId).eq("user_id", userId).in("status", ["new", "shown"]).select("id,status,responded_at").maybeSingle();
  if (error) return { kind: "error" };
  if (data && (data.status === target)) return { kind: "ok", idea: { id: data.id, status: target, respondedAt: data.responded_at }, idempotent: false };
  const reread = await client.from("happy_ideas").select("id,status,responded_at").eq("id", ideaId).eq("user_id", userId).maybeSingle();
  if (reread.error) return { kind: "error" };
  if (!reread.data) return { kind: "not_found" };
  if (reread.data.status === target) return { kind: "ok", idea: { id: reread.data.id, status: target, respondedAt: reread.data.responded_at }, idempotent: true };
  return { kind: "conflict" };
}
