import { getAssistantRequestIdentity } from "@/lib/assistant/chatIdentity";
import { markHappyNotification } from "@/lib/happy/notifications.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id) || (await request.text()).trim()) return Response.json({ error: "invalid_request" }, { status: 400 });
  const identity = await getAssistantRequestIdentity(request);
  if (identity.kind !== "authenticated" || !identity.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  const result = await markHappyNotification(identity.userId, id, true);
  if (result.kind === "ok") return Response.json({ notification: result.notification });
  return Response.json({ error: result.kind === "not_found" ? "not_found" : "service_unavailable" }, { status: result.kind === "not_found" ? 404 : 503 });
}
