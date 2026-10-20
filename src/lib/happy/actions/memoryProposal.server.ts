import "server-only";

import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { VerifiedChatScope } from "@/lib/assistant/chatScope";
import { getHappyToolDefinition } from "@/lib/happy/tools/happyTools";
import { readSupabasePublicConfig } from "@/lib/supabase/publicConfig";
import { hasActiveKnowledgeValueWithClient } from "@/lib/repositories/knowledgeRepository";

/** Structured, server-only output from a provider/tool boundary. */
export const memoryProposalCandidateSchema = z.object({
  kind: z.enum(["general_person_knowledge", "task_local", "uncertain", "do_not_remember"]),
  content: z.string().trim().min(1).max(2_000),
}).strict();

export type MemoryProposalCandidate = z.infer<typeof memoryProposalCandidateSchema>;

export type MemoryProposalResult =
  | { kind: "created"; actionId: string; personId: string; content: string }
  | { kind: "already_pending"; actionId: string }
  | { kind: "already_known"; personId: string }
  | { kind: "not_eligible"; reason: "global_scope" | "no_person" | "not_general" | "not_user_source" }
  | { kind: "unavailable" };

function admin(): SupabaseClient | null {
  const config = readSupabasePublicConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return config && key
    ? createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    : null;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function idempotencyKey(userId: string, personId: string, message: string, content: string): string {
  return `memory-proposal:${createHash("sha256").update(JSON.stringify({ userId, personId, message: normalize(message), content: normalize(content) })).digest("hex")}`;
}

function targetFromScope(scope: VerifiedChatScope): { personId: string; taskId: string | null } | null {
  if (scope.type === "global" || !scope.personId) return null;
  return { personId: scope.personId, taskId: scope.type === "task" ? scope.taskId : null };
}

/**
 * Creates only a pending save_memory action. This function never writes
 * Knowledge and never trusts target IDs from a model or browser payload.
 */
export async function createMemoryProposalFromCandidate(input: {
  userId: string;
  scope: VerifiedChatScope;
  currentUserMessage: string;
  candidate: unknown;
  client?: SupabaseClient | null;
}): Promise<MemoryProposalResult> {
  const parsed = memoryProposalCandidateSchema.safeParse(input.candidate);
  if (!parsed.success) return { kind: "not_eligible", reason: "not_user_source" };
  const target = targetFromScope(input.scope);
  if (!target) return { kind: input.scope.type === "global" ? "not_eligible" : "not_eligible", reason: input.scope.type === "global" ? "global_scope" : "no_person" };
  if (parsed.data.kind !== "general_person_knowledge") return { kind: "not_eligible", reason: "not_general" };
  const normalizedMessage = normalize(input.currentUserMessage);
  const normalizedContent = normalize(parsed.data.content);
  if (!normalizedMessage || !normalizedMessage.includes(normalizedContent)) return { kind: "not_eligible", reason: "not_user_source" };

  const client = input.client ?? admin();
  if (!client) return { kind: "unavailable" };
  let alreadyKnown: boolean;
  try { alreadyKnown = await hasActiveKnowledgeValueWithClient(client, { userId: input.userId, personId: target.personId, value: normalizedContent }); }
  catch { return { kind: "unavailable" }; }
  if (alreadyKnown) {
    return { kind: "already_known", personId: target.personId };
  }

  const tool = getHappyToolDefinition("save_memory");
  if (!tool) return { kind: "unavailable" };
  const key = idempotencyKey(input.userId, target.personId, input.currentUserMessage, parsed.data.content);
  const { data, error } = await client.from("happy_actions").insert({
    user_id: input.userId,
    task_id: target.taskId,
    step_id: null,
    type: "save_memory",
    payload: { personId: target.personId, content: parsed.data.content },
    status: "pending",
    idempotency_key: key,
  }).select("id").maybeSingle();
  if (!error && data?.id) return { kind: "created", actionId: data.id, personId: target.personId, content: parsed.data.content };
  if (error?.code === "23505") {
    const { data: pending } = await client.from("happy_actions").select("id,status").eq("user_id", input.userId).eq("idempotency_key", key).maybeSingle();
    if (pending?.status === "pending") return { kind: "already_pending", actionId: pending.id };
  }
  return { kind: "unavailable" };
}
