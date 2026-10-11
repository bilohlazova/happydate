import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getHappyToolDefinition } from "@/lib/happy/tools/happyTools";
import { createCanonicalGiftWithClient } from "@/lib/gifts/gift.persistence";
import { createKnowledgeOnServer } from "@/lib/repositories/knowledgeRepository";
import { readSupabasePublicConfig } from "@/lib/supabase/publicConfig";

type ActionRow = {
  id: string;
  user_id: string;
  type: string;
  payload: unknown;
  status: string;
  result: Record<string, unknown> | null;
  approved_at: string | null;
  rejected_at: string | null;
  executed_at: string | null;
};

type ExecutorResult =
  | { kind: "ok"; action: ActionRow; idempotent: boolean }
  | { kind: "not_found" | "conflict" | "unsupported" | "invalid_payload" | "stale" | "unavailable" };

function admin(): SupabaseClient | null {
  const config = readSupabasePublicConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !key) return null;
  return createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

const ACTION_COLUMNS = "id,user_id,type,payload,status,result,approved_at,rejected_at,executed_at";

async function loadOwnedAction(client: SupabaseClient, userId: string, actionId: string): Promise<ActionRow | null> {
  const { data, error } = await client.from("happy_actions").select(ACTION_COLUMNS).eq("id", actionId).eq("user_id", userId).maybeSingle();
  if (error || !data) return null;
  return data as ActionRow;
}

function actionResult(action: ActionRow, idempotent: boolean): ExecutorResult {
  return { kind: "ok", action, idempotent };
}

async function verifyPerson(client: SupabaseClient, userId: string, personId: string): Promise<boolean> {
  const { data, error } = await client.from("people").select("id").eq("id", personId).eq("user_id", userId).maybeSingle();
  return !error && Boolean(data);
}

async function verifyEvent(client: SupabaseClient, userId: string, eventId: string, personId: string): Promise<boolean> {
  const { data, error } = await client.from("events").select("id,person_id").eq("id", eventId).eq("user_id", userId).maybeSingle();
  return !error && data?.person_id === personId;
}

async function executeSaveGift(client: SupabaseClient, action: ActionRow, input: { personId: string; eventId?: string; title: string }): Promise<ExecutorResult> {
  if (!await verifyPerson(client, action.user_id, input.personId)) return { kind: "stale" };
  if (input.eventId && !await verifyEvent(client, action.user_id, input.eventId, input.personId)) return { kind: "stale" };
  try {
    const gift = await createCanonicalGiftWithClient(client, action.user_id, {
      personId: input.personId,
      eventId: input.eventId ?? null,
      title: input.title,
      lifecycle: "selected",
    });
    const result = { giftId: gift.id };
    const { data, error } = await client.from("happy_actions")
      .update({ status: "completed", approved_at: action.approved_at ?? new Date().toISOString(), executed_at: new Date().toISOString(), result })
      .eq("id", action.id).eq("user_id", action.user_id).eq("status", "pending")
      .select(ACTION_COLUMNS).maybeSingle();
    if (error) return { kind: "unavailable" };
    if (data) return actionResult(data as ActionRow, false);
    const reread = await client.from("happy_actions").select(ACTION_COLUMNS).eq("id", action.id).eq("user_id", action.user_id).maybeSingle();
    if (reread.data?.status === "completed") return actionResult(reread.data as ActionRow, true);
    return { kind: "conflict" };
  } catch {
    return { kind: "unavailable" };
  }
}

async function executeSaveMemory(client: SupabaseClient, action: ActionRow, input: { personId: string; content: string }): Promise<ExecutorResult> {
  if (!await verifyPerson(client, action.user_id, input.personId)) return { kind: "stale" };
  try {
    const knowledge = await createKnowledgeOnServer({
      userId: action.user_id,
      personId: input.personId,
      legacyType: "note",
      title: "Happy memory",
      content: input.content,
      value: input.content,
      source: "happy_action",
      sourceRecordId: action.id,
      sourceExcerpt: input.content,
      captureSchemaVersion: "happy-action-v1",
      userConfirmedAt: new Date().toISOString(),
    });
    const result = { knowledgeId: knowledge.id };
    const { data, error } = await client.from("happy_actions")
      .update({ status: "completed", approved_at: action.approved_at ?? new Date().toISOString(), executed_at: new Date().toISOString(), result })
      .eq("id", action.id).eq("user_id", action.user_id).eq("status", "pending")
      .select(ACTION_COLUMNS).maybeSingle();
    if (error) return { kind: "unavailable" };
    if (data) return actionResult(data as ActionRow, false);
    const reread = await client.from("happy_actions").select(ACTION_COLUMNS).eq("id", action.id).eq("user_id", action.user_id).maybeSingle();
    if (reread.data?.status === "completed") return actionResult(reread.data as ActionRow, true);
    return { kind: "conflict" };
  } catch {
    return { kind: "unavailable" };
  }
}

export async function approveHappyAction(userId: string, actionId: string): Promise<ExecutorResult> {
  const client = admin();
  if (!client) return { kind: "unavailable" };
  const action = await loadOwnedAction(client, userId, actionId);
  if (!action) return { kind: "not_found" };
  if (action.status === "completed") return actionResult(action, true);
  if (action.status !== "pending") return { kind: "conflict" };
  const definition = getHappyToolDefinition(action.type);
  if (!definition || definition.level !== "user_data_action" || action.type === "create_reminder") return { kind: "unsupported" };
  const parsed = definition.inputSchema.safeParse(action.payload);
  if (!parsed.success) return { kind: "invalid_payload" };
  if (action.type === "save_gift") return executeSaveGift(client, action, parsed.data as { personId: string; eventId?: string; title: string });
  if (action.type === "save_memory") return executeSaveMemory(client, action, parsed.data as { personId: string; content: string });
  return { kind: "unsupported" };
}

export async function rejectHappyAction(userId: string, actionId: string): Promise<ExecutorResult> {
  const client = admin();
  if (!client) return { kind: "unavailable" };
  const action = await loadOwnedAction(client, userId, actionId);
  if (!action) return { kind: "not_found" };
  if (action.status === "rejected") return actionResult(action, true);
  if (action.status !== "pending") return { kind: "conflict" };
  const { data, error } = await client.from("happy_actions")
    .update({ status: "rejected", rejected_at: new Date().toISOString() })
    .eq("id", action.id).eq("user_id", userId).eq("status", "pending")
    .select(ACTION_COLUMNS).maybeSingle();
  if (error) return { kind: "unavailable" };
  if (data) return actionResult(data as ActionRow, false);
  const reread = await client.from("happy_actions").select(ACTION_COLUMNS).eq("id", action.id).eq("user_id", userId).maybeSingle();
  if (reread.data?.status === "rejected") return actionResult(reread.data as ActionRow, true);
  return { kind: "conflict" };
}
