import { authenticateHappyLearningRequest } from "@/lib/happy-learning/happyLearningAccess.server";
import { respondToHappyIdea } from "@/lib/happy/ideas.server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request: Request, context: { params: Promise<{ id: string; response: string }> }) {
  const { id, response } = await context.params;
  if (!uuid.test(id) || (response !== "accept" && response !== "dismiss")) return Response.json({ error: "invalid_request" }, { status: 400 });
  const auth = await authenticateHappyLearningRequest(request);
  if (!auth) return Response.json({ error: "unauthorized" }, { status: 401 });
  const result = await respondToHappyIdea(auth.userId, id, response === "accept" ? "accepted" : "dismissed");
  if (result.kind === "ok") return Response.json({ idea: result.idea, idempotent: result.idempotent });
  return Response.json({ error: result.kind === "not_found" ? "not_found" : result.kind === "conflict" ? "conflict" : "service_unavailable" }, { status: result.kind === "not_found" ? 404 : result.kind === "conflict" ? 409 : 503 });
}
