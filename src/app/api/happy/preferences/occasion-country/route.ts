import { z } from "zod";
import { createAssistantRlsClient, getAssistantRequestIdentity } from "@/lib/assistant/chatIdentity";
import { getOccasionCountry, saveOccasionCountry } from "@/lib/occasions/occasionCountry.repository";

const schema = z.object({ countryCode: z.union([z.literal("PL"), z.null()]) }).strict();
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function identity(request: Request) {
  const value = await getAssistantRequestIdentity(request);
  if (value.kind !== "authenticated" || !value.userId) return null;
  const scoped = createAssistantRlsClient(request);
  return scoped ? { userId: value.userId, client: scoped.client } : null;
}

export async function GET(request: Request) {
  const value = await identity(request);
  if (!value) return json({ error: "unauthorized" }, 401);
  try { return json({ countryCode: await getOccasionCountry(value.client, value.userId) }); }
  catch { return json({ error: "service_unavailable" }, 503); }
}

export async function PATCH(request: Request) {
  const value = await identity(request);
  if (!value) return json({ error: "unauthorized" }, 401);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "invalid_request" }, 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_request" }, 400);
  try { return json({ countryCode: await saveOccasionCountry(value.client, value.userId, parsed.data.countryCode) }); }
  catch { return json({ error: "service_unavailable" }, 503); }
}
