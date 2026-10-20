import { getAssistantRequestIdentity } from "@/lib/assistant/chatIdentity";
import { selectBirthdayGiftRecommendation } from "@/lib/happy/task-engine/selectBirthdayGiftRecommendation.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return Response.json({ error: "invalid_request" }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || !UUID.test((body as { recommendationId?: unknown }).recommendationId as string)) return Response.json({ error: "invalid_request" }, { status: 400 });
  const identity = await getAssistantRequestIdentity(request);
  if (identity.kind !== "authenticated" || !identity.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  const result = await selectBirthdayGiftRecommendation(identity.userId, id, (body as { recommendationId: string }).recommendationId);
  if (result.kind === "ok") return Response.json(result);
  return Response.json({ error: result.kind }, { status: result.kind === "not_found" ? 404 : result.kind === "unavailable" ? 503 : 409 });
}
