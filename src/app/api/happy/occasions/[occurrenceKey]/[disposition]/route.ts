import { getAssistantRequestIdentity, createAssistantRlsClient } from "@/lib/assistant/chatIdentity";
import { quietCurrentOccasion } from "@/lib/occasions/occasionQuiet.server";

export async function POST(request: Request, context: { params: Promise<{ occurrenceKey: string; disposition: string }> }) {
  const { occurrenceKey, disposition } = await context.params;
  if (!/^occasion:[a-z][a-z0-9_]*:\d{4}$/.test(occurrenceKey) || (disposition !== "later" && disposition !== "dismiss")) return Response.json({ error: "invalid_request" }, { status: 400 });
  if ((await request.text()).trim()) return Response.json({ error: "invalid_request" }, { status: 400 });
  const identity = await getAssistantRequestIdentity(request);
  if (identity.kind !== "authenticated" || !identity.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  const scoped = createAssistantRlsClient(request);
  if (!scoped) return Response.json({ error: "unauthorized" }, { status: 401 });
  const result = await quietCurrentOccasion({ client: scoped.client, userId: identity.userId, occurrenceKey, disposition: disposition === "dismiss" ? "dismissed" : "later" });
  if (result.kind === "ok") return Response.json({ disposition: result.disposition, idempotent: result.idempotent });
  const status = result.kind === "not_found" ? 404 : result.kind === "conflict" ? 409 : result.kind === "unavailable" ? 503 : 500;
  return Response.json({ error: result.kind === "error" ? "service_unavailable" : result.kind }, { status });
}
