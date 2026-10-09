import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readSupabasePublicConfig } from "@/lib/supabase/publicConfig";
import {
  normalizeTaskDecisionValue,
  projectActiveTaskDecisions,
  type ActiveTaskDecisions,
  type BirthdayTaskDecision,
} from "./taskDecisions";

const LIMIT = 20;

type DecisionRow = { kind: string; display_value: string; normalized_value: string; status: string };
type OwnedTask = { id: string; type: string };

export type TaskDecisionResult =
  | { kind: "ok"; decision: BirthdayTaskDecision; idempotent: boolean }
  | { kind: "not_found" | "invalid_task" | "unavailable" };

function trustedClient() {
  const config = readSupabasePublicConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !key) return null;
  return createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

function mapDecision(row: DecisionRow): BirthdayTaskDecision | null {
  return row.kind === "avoid_gift_theme"
    && row.status === "active"
    && typeof row.display_value === "string"
    && row.display_value.trim()
    ? { kind: "avoid_gift_theme", value: row.display_value }
    : null;
}

async function ownedBirthdayTask(client: SupabaseClient, userId: string, taskId: string): Promise<"ok" | "not_found" | "invalid_task" | "unavailable"> {
  const { data, error } = await client
    .from("happy_tasks")
    .select("id,type")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return "unavailable";
  if (!data) return "not_found";
  return (data as OwnedTask).type === "birthday_preparation" ? "ok" : "invalid_task";
}

/** RLS-compatible bounded read used only after task scope has been verified. */
export async function getActiveTaskDecisions(client: SupabaseClient, input: { userId: string; taskId: string }): Promise<ActiveTaskDecisions | null> {
  const { data, error } = await client
    .from("happy_task_decisions")
    .select("kind,display_value,normalized_value,status")
    .eq("user_id", input.userId)
    .eq("task_id", input.taskId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(LIMIT);
  if (error) return null;
  const rows = (data ?? []).flatMap((row) => {
    const mapped = mapDecision(row as DecisionRow);
    return mapped ? [mapped] : [];
  });
  return projectActiveTaskDecisions(rows);
}

export async function addTaskDecision(input: { userId: string; taskId: string; decision: BirthdayTaskDecision }): Promise<TaskDecisionResult> {
  const client = trustedClient();
  if (!client) return { kind: "unavailable" };
  const task = await ownedBirthdayTask(client, input.userId, input.taskId);
  if (task !== "ok") return { kind: task };
  const displayValue = input.decision.value.trim().replace(/\s+/g, " ");
  const normalizedValue = normalizeTaskDecisionValue(displayValue);
  if (!normalizedValue) return { kind: "invalid_task" };
  const { data, error } = await client
    .from("happy_task_decisions")
    .upsert({
      user_id: input.userId,
      task_id: input.taskId,
      kind: input.decision.kind,
      display_value: displayValue,
      normalized_value: normalizedValue,
      status: "active",
    }, { onConflict: "user_id,task_id,kind,normalized_value" })
    .select("kind,display_value,normalized_value,status")
    .maybeSingle();
  if (error || !data) return { kind: "unavailable" };
  const decision = mapDecision(data as DecisionRow);
  return decision ? { kind: "ok", decision, idempotent: false } : { kind: "unavailable" };
}

export async function revokeTaskDecision(input: { userId: string; taskId: string; decision: BirthdayTaskDecision }): Promise<TaskDecisionResult> {
  const client = trustedClient();
  if (!client) return { kind: "unavailable" };
  const task = await ownedBirthdayTask(client, input.userId, input.taskId);
  if (task !== "ok") return { kind: task };
  const normalizedValue = normalizeTaskDecisionValue(input.decision.value);
  const { data, error } = await client
    .from("happy_task_decisions")
    .update({ status: "revoked" })
    .eq("user_id", input.userId)
    .eq("task_id", input.taskId)
    .eq("kind", input.decision.kind)
    .eq("normalized_value", normalizedValue)
    .eq("status", "active")
    .select("kind,display_value,normalized_value,status")
    .maybeSingle();
  if (error) return { kind: "unavailable" };
  return { kind: "ok", decision: { kind: input.decision.kind, value: data?.display_value ?? input.decision.value.trim() }, idempotent: !data };
}
