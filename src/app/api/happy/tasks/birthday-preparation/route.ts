import { z } from "zod";
import { createAssistantRlsClient, getAssistantRequestIdentity } from "@/lib/assistant/chatIdentity";
import { createBirthdayPreparationForEvent } from "@/lib/happy/task-engine/createBirthdayPreparationForEvent.server";
import { readBoundedJson } from "@/lib/server/readBoundedJson";

export const runtime = "nodejs";

const requestSchema = z.object({ eventId: z.string().uuid() }).strict();
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const bounded = await readBoundedJson(request, 1_024);
  if (!bounded.ok) return json({ error: bounded.error }, bounded.status);
  const parsed = requestSchema.safeParse(bounded.value);
  if (!parsed.success) return json({ error: "invalid_request" }, 400);

  const identity = await getAssistantRequestIdentity(request);
  if (identity.kind !== "authenticated" || !identity.userId) return json({ error: "unauthorized" }, 401);
  const rls = createAssistantRlsClient(request);
  if (!rls) return json({ error: "unauthorized" }, 401);

  const result = await createBirthdayPreparationForEvent({
    client: rls.client,
    verifiedUserId: identity.userId,
    eventId: parsed.data.eventId,
  });
  if (result.kind === "ok") return json({ task: { id: result.task.id, status: result.task.status }, reused: result.reused });
  if (result.kind === "not_found") return json({ error: "not_found" }, 404);
  if (result.kind === "invalid_target") return json({ error: "invalid_target" }, 409);
  return json({ error: "service_unavailable" }, 503);
}
