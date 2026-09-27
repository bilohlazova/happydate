import "server-only";

import { createClient } from "@supabase/supabase-js";

import { readSupabasePublicConfig } from "@/lib/supabase/publicConfig";

import { getHappyTaskTemplate, type BirthdayPreparationStepType } from "./happyTaskTemplate";

type DurableStep = {
  id: string;
  position: number;
  type: string;
  status: string;
  requiresApproval: boolean;
};

type RpcRow = {
  task_id: string;
  reused: boolean;
  task_status: string;
  context_snapshot: unknown;
  durable_steps: unknown;
};

export type CreateHappyTaskInput = {
  verifiedUserId: string;
  type: string;
  personId: string;
  eventId: string;
};

export type CreateHappyTaskResult = {
  kind: "ok";
  task: { id: string; type: "birthday_preparation"; status: string };
  steps: Array<{
    id: string;
    position: number;
    type: BirthdayPreparationStepType;
    status: string;
    requiresApproval: boolean;
    waitsForUser: boolean;
    optional: boolean;
  }>;
  reused: boolean;
} | {
  kind: "unsupported_task_type" | "not_found" | "invalid_target" | "template_mismatch" | "data_unavailable";
};

function trustedClient() {
  const config = readSupabasePublicConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !key) return null;
  return createClient(config.url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function isTemplateMetadata(value: unknown): value is { templateVersion: 1 } {
  return !!value
    && typeof value === "object"
    && Object.keys(value).length === 1
    && (value as { templateVersion?: unknown }).templateVersion === 1;
}

function isDurableStep(value: unknown): value is DurableStep {
  if (!value || typeof value !== "object") return false;
  const step = value as Record<string, unknown>;
  return typeof step.id === "string"
    && Number.isInteger(step.position)
    && typeof step.type === "string"
    && typeof step.status === "string"
    && typeof step.requiresApproval === "boolean";
}

export async function createHappyTaskFromTemplate(input: CreateHappyTaskInput): Promise<CreateHappyTaskResult> {
  const template = getHappyTaskTemplate(input.type);
  if (!template) return { kind: "unsupported_task_type" };

  const client = trustedClient();
  if (!client) return { kind: "data_unavailable" };

  const { data, error } = await client.rpc("create_birthday_preparation_task_v1", {
    p_user_id: input.verifiedUserId,
    p_person_id: input.personId,
    p_event_id: input.eventId,
  });
  if (error) {
    if (error.code === "P0002") return { kind: "not_found" };
    if (error.code === "23514") return { kind: "invalid_target" };
    return { kind: "data_unavailable" };
  }

  const row = Array.isArray(data) ? data[0] as RpcRow | undefined : undefined;
  if (!row || typeof row.task_id !== "string" || typeof row.reused !== "boolean" || typeof row.task_status !== "string" || !isTemplateMetadata(row.context_snapshot) || !Array.isArray(row.durable_steps) || row.durable_steps.length !== template.steps.length || !row.durable_steps.every(isDurableStep)) {
    return { kind: "template_mismatch" };
  }

  const steps = row.durable_steps
    .slice()
    .sort((left, right) => left.position - right.position)
    .map((step, index) => {
      const canonical = template.steps[index];
      if (!canonical || step.position !== canonical.position || step.type !== canonical.type || step.requiresApproval !== canonical.requiresApproval) return null;
      return {
        id: step.id,
        position: step.position,
        type: canonical.type,
        status: step.status,
        requiresApproval: step.requiresApproval,
        waitsForUser: canonical.waitsForUser,
        optional: canonical.optional,
      };
    });
  if (steps.some((step) => step === null)) return { kind: "template_mismatch" };

  return {
    kind: "ok",
    task: { id: row.task_id, type: "birthday_preparation", status: row.task_status },
    steps: steps as Extract<CreateHappyTaskResult, { kind: "ok" }> ["steps"],
    reused: row.reused,
  };
}
