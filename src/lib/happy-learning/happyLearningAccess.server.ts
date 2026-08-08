import { createClient } from "@supabase/supabase-js";
import type { KnowledgeItem } from "../knowledge/index.ts";
import { listKnowledgeForOwnedPersonWithClient } from "../repositories/knowledgeRepository.ts";
import type { HappyLearningOwnedPerson } from "./happyLearningDetectV2.types.ts";
import { readSupabasePublicConfig } from "../supabase/publicConfig.ts";

export type HappyLearningAuthContext = {
  userId: string;
  accessToken: string;
};

function client(accessToken: string) {
  const publicSupabaseConfig = readSupabasePublicConfig();
  if (!publicSupabaseConfig) return null;
  return createClient(publicSupabaseConfig.url, publicSupabaseConfig.key, {
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

/** Read-only owned-person Knowledge catalog used for semantic status checks. */
export async function loadOwnedHappyLearningKnowledge(
  auth: HappyLearningAuthContext,
  personId: string,
): Promise<KnowledgeItem[]> {
  const supabase = client(auth.accessToken);
  if (!supabase) return [];
  try {
    return await listKnowledgeForOwnedPersonWithClient(supabase, {
      userId: auth.userId,
      personId,
    });
  } catch {
    throw new Error("happy_learning_knowledge_unavailable");
  }
}
