import { getAssistantRequestIdentity } from "@/lib/assistant/chatIdentity";
import { listHappyNotifications } from "@/lib/happy/notifications.server";

export async function GET(request: Request) {
  const identity = await getAssistantRequestIdentity(request);
  if (identity.kind !== "authenticated" || !identity.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  const pageValue = new URL(request.url).searchParams.get("page");
  const page = pageValue === null ? 0 : Number(pageValue);
  if (!Number.isInteger(page) || page < 0 || page > 100) return Response.json({ error: "invalid_request" }, { status: 400 });
  try {
    return Response.json(await listHappyNotifications(identity.userId, page), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  }
}
