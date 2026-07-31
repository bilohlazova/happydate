import { createClient } from "@supabase/supabase-js";
import type { HappyLearningOwnedPerson } from "./happyLearningDetectV2.types.ts";

export type HappyLearningAuthContext = {
  userId: string;
  accessToken: string;
};

function client(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export async function authenticateHappyLearningRequest(
  request: Request,
): Promise<HappyLearningAuthContext | null> {
  const accessToken = request.headers.get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!accessToken) return null;
  const supabase = client(accessToken);
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser(accessToken);
  return !error && data.user?.id ? { userId: data.user.id, accessToken } : null;
}

/** General ownership-safe people lookup; deliberately independent of Gift. */
export async function findOwnedHappyLearningPerson(
  auth: HappyLearningAuthContext,
  personId: string,
): Promise<HappyLearningOwnedPerson | null> {
  const supabase = client(auth.accessToken);
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("people")
    .select("id, name")
    .eq("id", personId)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (error || !data || typeof data.id !== "string" || typeof data.name !== "string") return null;
  return { id: data.id, name: data.name };
}
