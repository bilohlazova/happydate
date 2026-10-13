import { z } from "zod";
import { createAssistantRlsClient, getAssistantRequestIdentity } from "@/lib/assistant/chatIdentity";

const schema = z.object({ mode: z.enum(["minimal", "balanced", "active"]) }).strict();
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  const identity = await getAssistantRequestIdentity(request);
  if (identity.kind !== "authenticated" || !identity.userId) return json({ error: "unauthorized" }, 401);
  const scoped = createAssistantRlsClient(request);
  if (!scoped) return json({ error: "unauthorized" }, 401);
  const { data, error } = await scoped.client.from("happy_proactivity_preferences").select("mode").eq("user_id", identity.userId).maybeSingle();
  if (error) return json({ error: "service_unavailable" }, 503);
  return json({ mode: data?.mode === "minimal" || data?.mode === "active" ? data.mode : "balanced" });
}

export async function PATCH(request: Request) {
  const identity = await getAssistantRequestIdentity(request);
  if (identity.kind !== "authenticated" || !identity.userId) return json({ error: "unauthorized" }, 401);
  const scoped = createAssistantRlsClient(request);
  if (!scoped) return json({ error: "unauthorized" }, 401);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "invalid_request" }, 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_request" }, 400);
  const { data, error } = await scoped.client.from("happy_proactivity_preferences").upsert({ user_id: identity.userId, mode: parsed.data.mode, updated_at: new Date().toISOString() }, { onConflict: "user_id" }).select("mode").single();
  if (error) return json({ error: "service_unavailable" }, 503);
  return json({ mode: data.mode });
}
