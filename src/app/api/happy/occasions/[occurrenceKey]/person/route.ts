import { z } from "zod";
import { createAssistantRlsClient, getAssistantRequestIdentity } from "@/lib/assistant/chatIdentity";
import { getUserOccasionsForLocalDay, parseOccasionOccurrenceKey } from "@/lib/occasions/occasionResolver";
import { getOccasionDefinition } from "@/lib/occasions/occasionRegistry";
import { listOwnedOccasionPeople, createTrustedOccasionClient, saveSelectedOccasionPerson } from "@/lib/occasions/occasionPeople.repository";
import { isPersonRelevantForOccasion } from "@/lib/occasions/occasionPeoplePolicy";

const UUID = z.string().uuid();
const bodySchema = z.object({ personId: UUID }).strict();
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request, context: { params: Promise<{ occurrenceKey: string }> }) {
  const identity = await getAssistantRequestIdentity(request);
  if (identity.kind !== "authenticated" || !identity.userId) return json({ error: "unauthorized" }, 401);
  const { occurrenceKey } = await context.params;
  const parsedOccurrence = parseOccasionOccurrenceKey(occurrenceKey);
  if (!parsedOccurrence) return json({ error: "invalid_request" }, 400);
  let rawBody: unknown;
  try { rawBody = await request.json(); } catch { return json({ error: "invalid_request" }, 400); }
  const parsedBody = bodySchema.safeParse(rawBody);
  if (!parsedBody.success) return json({ error: "invalid_request" }, 400);
  const rls = createAssistantRlsClient(request);
  const trusted = createTrustedOccasionClient();
  if (!rls || !trusted) return json({ error: "service_unavailable" }, 503);

  try {
    const occurrences = await getUserOccasionsForLocalDay({ client: rls.client, userId: identity.userId });
    const occurrence = occurrences.find((item) => item.occurrenceKey === occurrenceKey && item.occasionKey === parsedOccurrence.occasionKey && item.year === parsedOccurrence.year);
    const definition = getOccasionDefinition(parsedOccurrence.occasionKey);
    if (!occurrence || !definition) return json({ error: "not_found" }, 404);

    const people = await listOwnedOccasionPeople(trusted, identity.userId);
    const candidate = people.find((person) => person.id === parsedBody.data.personId);
    if (!candidate || !isPersonRelevantForOccasion(definition, candidate).relevant) return json({ error: "not_found" }, 404);

    const saved = await saveSelectedOccasionPerson({
      client: trusted,
      userId: identity.userId,
      occasionKey: occurrence.occasionKey,
      occurrenceKey: occurrence.occurrenceKey,
      personId: candidate.id,
    });
    return json({ kind: "resolved", occasionKey: occurrence.occasionKey, occurrenceKey: occurrence.occurrenceKey, personId: saved.personId, idempotent: saved.idempotent });
  } catch {
    return json({ error: "service_unavailable" }, 503);
  }
}
