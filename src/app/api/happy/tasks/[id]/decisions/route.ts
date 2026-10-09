import { z } from "zod";

import { getAssistantRequestIdentity } from "@/lib/assistant/chatIdentity";
import { addTaskDecision, revokeTaskDecision } from "@/lib/happy/taskDecisions.server";
import { readBoundedJson } from "@/lib/server/readBoundedJson";

export const runtime = "nodejs";

const uuid = z.string().uuid();
const decisionSchema = z.object({
  kind: z.literal("avoid_gift_theme"),
  value: z.string().trim().min(1).max(160),
}).strict();
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function identityFor(request: Request) {
  const identity = await getAssistantRequestIdentity(request);
  return identity.kind === "authenticated" && identity.userId ? identity.userId : null;
}

async function parse(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bounded = await readBoundedJson(request, 1_024);
  if (!bounded.ok || !uuid.safeParse(id).success) return null;
  const decision = decisionSchema.safeParse(bounded.value);
  return decision.success ? { taskId: id, decision: decision.data } : null;
}

function resultResponse(result: Awaited<ReturnType<typeof addTaskDecision>>) {
  if (result.kind === "ok") return json({ decision: result.decision, idempotent: result.idempotent });
  if (result.kind === "not_found") return json({ error: "not_found" }, 404);
  if (result.kind === "invalid_task") return json({ error: "invalid_target" }, 409);
  return json({ error: "service_unavailable" }, 503);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await identityFor(request);
  if (!userId) return json({ error: "unauthorized" }, 401);
  const input = await parse(request, context);
  if (!input) return json({ error: "invalid_request" }, 400);
  return resultResponse(await addTaskDecision({ userId, ...input }));
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await identityFor(request);
  if (!userId) return json({ error: "unauthorized" }, 401);
  const input = await parse(request, context);
  if (!input) return json({ error: "invalid_request" }, 400);
  return resultResponse(await revokeTaskDecision({ userId, ...input }));
}
