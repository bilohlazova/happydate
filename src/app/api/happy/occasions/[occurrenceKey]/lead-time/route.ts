import { z } from "zod";
import { createAssistantRlsClient, getAssistantRequestIdentity } from "@/lib/assistant/chatIdentity";
import { createTrustedOccasionClient } from "@/lib/occasions/occasionPeople.repository";
import { getOccasionCountry } from "@/lib/occasions/occasionCountry.repository";
import { getOccasionDefinition } from "@/lib/occasions/occasionRegistry";
import { saveOccasionLeadTime } from "@/lib/occasions/occasionOutcome.server";

const schema = z.object({ leadTimeDays: z.union([z.literal(7), z.literal(14), z.literal(21), z.literal(30)]) }).strict();
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request, context: { params: Promise<{ occurrenceKey: string }> }) {
  const identity = await getAssistantRequestIdentity(request);
  if (identity.kind !== "authenticated" || !identity.userId) return json({ error: "unauthorized" }, 401);
  const { occurrenceKey: occasionKey } = await context.params;
  const definition = getOccasionDefinition(occasionKey);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "invalid_request" }, 400); }
  const parsedBody = schema.safeParse(body);
  if (!definition || !parsedBody.success) return json({ error: "invalid_request" }, 400);
  const scoped = createAssistantRlsClient(request);
  const trusted = createTrustedOccasionClient();
  if (!scoped || !trusted) return json({ error: "service_unavailable" }, 503);
  try {
    if ((await getOccasionCountry(scoped.client, identity.userId)) !== definition.countryCode) return json({ error: "not_found" }, 404);
    const leadTimeDays = await saveOccasionLeadTime({ client: trusted, userId: identity.userId, occasionKey, leadTimeDays: parsedBody.data.leadTimeDays });
    return json({ occasionKey, leadTimeDays });
  } catch { return json({ error: "service_unavailable" }, 503); }
}
