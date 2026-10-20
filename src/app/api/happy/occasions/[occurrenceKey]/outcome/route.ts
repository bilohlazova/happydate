import { z } from "zod";
import { createAssistantRlsClient, getAssistantRequestIdentity } from "@/lib/assistant/chatIdentity";
import { createTrustedOccasionClient } from "@/lib/occasions/occasionPeople.repository";
import { OCCASION_OUTCOMES, getOccasionLeadTimeProposal, resolveOwnedPostEventOccurrence, saveOccasionOutcome } from "@/lib/occasions/occasionOutcome.server";

const schema = z.object({ outcome: z.enum(OCCASION_OUTCOMES) }).strict();
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request, context: { params: Promise<{ occurrenceKey: string }> }) {
  const identity = await getAssistantRequestIdentity(request);
  if (identity.kind !== "authenticated" || !identity.userId) return json({ error: "unauthorized" }, 401);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "invalid_request" }, 400); }
  const parsedBody = schema.safeParse(body);
  if (!parsedBody.success) return json({ error: "invalid_request" }, 400);
  const { occurrenceKey } = await context.params;
  const scoped = createAssistantRlsClient(request);
  const trusted = createTrustedOccasionClient();
  if (!scoped || !trusted) return json({ error: "service_unavailable" }, 503);
  try {
    const target = await resolveOwnedPostEventOccurrence({ client: scoped.client, userId: identity.userId, occurrenceKey });
    if (!target) return json({ error: "not_found" }, 404);
    const result = await saveOccasionOutcome({ client: trusted, userId: identity.userId, occurrenceKey: target.occurrenceKey, personId: target.personId, outcome: parsedBody.data.outcome });
    const earlierLeadTimeProposal = result.outcome === "needed_more_time" ? await getOccasionLeadTimeProposal({ client: trusted, userId: identity.userId, occasionKey: target.occasionKey }) : null;
    return json({ ...result, earlierLeadTimeProposal });
  } catch { return json({ error: "service_unavailable" }, 503); }
}
