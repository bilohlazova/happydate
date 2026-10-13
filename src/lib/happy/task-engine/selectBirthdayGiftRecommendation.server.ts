import "server-only";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabasePublicConfig } from "@/lib/supabase/publicConfig";

export type BirthdayGiftChoiceResult =
  | { kind: "ok"; actionId: string; idempotent: boolean }
  | { kind: "not_found" | "conflict" | "unavailable" };

function admin(): SupabaseClient | null {
  const config = readSupabasePublicConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return config && key ? createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }) : null;
}

/** Server-only choice boundary: only an already-persisted recommendation ID is accepted. */
export async function selectBirthdayGiftRecommendation(userId: string, taskId: string, recommendationId: string): Promise<BirthdayGiftChoiceResult> {
  const client = admin();
  if (!client) return { kind: "unavailable" };
  const idempotencyKey = `birthday-choice:${taskId}:${recommendationId}:save_gift`;
  const { data, error } = await client.rpc("select_birthday_gift_recommendation_v1", {
    p_user_id: userId,
    p_task_id: taskId,
    p_recommendation_id: recommendationId,
    p_action_id: randomUUID(),
    p_idempotency_key: idempotencyKey,
  });
  if (typeof data === "string") return { kind: "ok", actionId: data, idempotent: data !== null && false };
  if (error?.code === "P0002") return { kind: "not_found" };
  if (error?.code === "23505" || error?.code === "23514") return { kind: "conflict" };
  return { kind: "unavailable" };
}

/** Narrow birthday adapter around the generic executor; never belongs in it. */
export async function reconcileBirthdaySaveGiftAction(userId: string, actionId: string, outcome: "completed" | "rejected"): Promise<boolean> {
  const client = admin();
  if (!client) return false;
  const { data, error } = await client.rpc("reconcile_birthday_save_gift_action_v1", { p_user_id: userId, p_action_id: actionId, p_outcome: outcome });
  return !error && data === true;
}
