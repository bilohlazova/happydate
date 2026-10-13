import { getAssistantRequestIdentity } from "@/lib/assistant/chatIdentity";
import { quietHappyProactiveItem } from "@/lib/happy/proactive/quiet.server";

export async function POST(request: Request, context: { params: Promise<{ id: string; disposition: string }> }) {
  const { id, disposition } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || (disposition !== "later" && disposition !== "dismiss")) return Response.json({ error: "invalid_request" }, { status: 400 });
  if ((await request.text()).trim()) return Response.json({ error: "invalid_request" }, { status: 400 });
  const identity = await getAssistantRequestIdentity(request);
  if (identity.kind !== "authenticated" || !identity.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  const result = await quietHappyProactiveItem(identity.userId, id, disposition === "dismiss" ? "dismissed" : "later");
  if (result.kind === "ok") return Response.json({ disposition: result.disposition, idempotent: result.idempotent });
  const status = result.kind === "not_found" ? 404 : result.kind === "unavailable" ? 503 : result.kind === "conflict" ? 409 : 500;
  return Response.json({ error: result.kind === "error" ? "service_unavailable" : result.kind }, { status });
}
