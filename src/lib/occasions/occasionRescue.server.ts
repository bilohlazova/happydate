import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserOccasionsForLocalDay, parseOccasionOccurrenceKey } from "./occasionResolver.ts";
import { getOccasionDefinition } from "./occasionRegistry.ts";
import { resolveRelevantPeopleForOccasion } from "./occasionPeople.repository.ts";
import { getOccasionPreparationForUser } from "./occasionPreparation.server.ts";
import { rescueResultSchema, resolveOccasionRescueEligibility } from "./occasionRescue.ts";
import type { OccasionRescueProvider, OccasionRescueResponse } from "./occasionRescue.types.ts";

export type OccasionRescueResolution =
 | { kind: "not_found" }
 | { kind: "ineligible" }
 | { kind: "eligible"; occasionKey: "pl_boys_day"; occurrenceKey: string; person: { id: string; name: string; relationKey: string | null }; phase: "urgent" | "today"; missing: readonly ("gift" | "greeting" | "preparation")[] };

/** Re-derives every client-sensitive fact through the authenticated RLS client. */
export async function resolveOccasionRescueForUser(input: { client: SupabaseClient; userId: string; occurrenceKey: string; now?: Date }): Promise<OccasionRescueResolution> {
  const parsed = parseOccasionOccurrenceKey(input.occurrenceKey);
  if (!parsed) return { kind: "not_found" };
  const occurrences = await getUserOccasionsForLocalDay({ client: input.client, userId: input.userId, now: input.now });
  const occurrence = occurrences.find((value) => value.occurrenceKey === input.occurrenceKey && value.occasionKey === parsed.occasionKey && value.year === parsed.year);
  const definition = getOccasionDefinition(parsed.occasionKey);
  if (!occurrence || !definition || occurrence.occasionKey !== "pl_boys_day") return { kind: "not_found" };
  const people = await resolveRelevantPeopleForOccasion({ client: input.client, userId: input.userId, occurrence });
  const preparation = people.kind === "resolved" ? await getOccasionPreparationForUser({ client: input.client, userId: input.userId, occurrenceKey: occurrence.occurrenceKey, now: input.now }) : undefined;
  const eligibility = resolveOccasionRescueEligibility({
    occurrenceKey: occurrence.occurrenceKey,
    personId: people.kind === "resolved" ? people.personId : null,
    recipientResolution: people.kind === "resolved" ? "resolved" : people.kind,
    phase: occurrence.phase,
    readiness: preparation?.kind === "resolved" ? preparation.readiness : undefined,
  });
  if (eligibility.kind !== "eligible" || people.kind !== "resolved" || preparation?.kind !== "resolved" || (occurrence.phase !== "urgent" && occurrence.phase !== "today")) return { kind: "ineligible" };
  const { data, error } = await input.client.from("people").select("id,name,relation_key").eq("id", people.personId).eq("user_id", input.userId).maybeSingle();
  if (error) throw new Error("occasion_rescue_unavailable");
  if (!data || typeof data.name !== "string") return { kind: "not_found" };
  return { kind: "eligible", occasionKey: "pl_boys_day", occurrenceKey: occurrence.occurrenceKey, person: { id: data.id as string, name: data.name, relationKey: typeof data.relation_key === "string" ? data.relation_key : null }, phase: occurrence.phase, missing: eligibility.missing };
}

/** Advisory-only generation: validation happens before and after provider use; no writes. */
export async function generateOccasionRescue(input: { resolved: Extract<OccasionRescueResolution, { kind: "eligible" }>; locale: string; provider: OccasionRescueProvider; signal?: AbortSignal }): Promise<OccasionRescueResponse> {
  const raw = await input.provider({ ...input.resolved, locale: input.locale, signal: input.signal });
  const parsed = rescueResultSchema.safeParse(raw);
  if (!parsed.success) throw Object.assign(new Error("invalid provider output"), { code: "invalid_provider_output" });
  return parsed.data;
}
