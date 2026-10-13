import { getAssistantRequestIdentity } from "@/lib/assistant/chatIdentity";
import { rejectHappyAction } from "@/lib/happy/actions/actionExecutor.server";
import { reconcileBirthdaySaveGiftAction } from "@/lib/happy/task-engine/selectBirthdayGiftRecommendation.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return Response.json({ error: "invalid_request" }, { status: 400 });
  if ((await request.text()).trim()) return Response.json({ error: "invalid_request" }, { status: 400 });
  const identity = await getAssistantRequestIdentity(request);
  if (identity.kind !== "authenticated" || !identity.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  const result = await rejectHappyAction(identity.userId, id);
  if (result.kind === "ok") { await reconcileBirthdaySaveGiftAction(identity.userId, id, "rejected"); return Response.json({ action: result.action, idempotent: result.idempotent }); }
  const status = result.kind === "not_found" ? 404 : result.kind === "unavailable" ? 503 : 409;
  return Response.json({ error: result.kind }, { status });
}
