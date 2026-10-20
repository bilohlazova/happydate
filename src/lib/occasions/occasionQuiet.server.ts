import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserOccasionsForLocalDay } from "./occasionResolver";
import { resolveRelevantPeopleForOccasion } from "./occasionPeople.repository";
import { getOccasionPreparationForUser } from "./occasionPreparation.server";
import { buildOccasionQuietKey, occasionCheckpointForPhase, type OccasionCheckpoint, type QuietDisposition } from "../../../supabase/functions/happy-proactive/proactivity-policy";
import { quietHappySemanticKey, type QuietResult } from "@/lib/happy/proactive/quiet.server";

export type OccasionQuietResolution =
  | { kind: "not_found" }
  | { kind: "ineligible" }
  | { kind: "resolved"; quietKey: string; checkpoint: OccasionCheckpoint };

export async function resolveCurrentOccasionQuiet(input: { client: SupabaseClient; userId: string; occurrenceKey: string; now?: Date }): Promise<OccasionQuietResolution> {
  const occurrence = (await getUserOccasionsForLocalDay({ client: input.client, userId: input.userId, now: input.now })).find((item) => item.occurrenceKey === input.occurrenceKey);
  if (!occurrence) return { kind: "not_found" };
  const checkpoint = occasionCheckpointForPhase(occurrence.phase);
  if (!checkpoint) return { kind: "ineligible" };
  const people = await resolveRelevantPeopleForOccasion({ client: input.client, userId: input.userId, occurrence });
  if (people.kind === "none") return { kind: "not_found" };
  if (people.kind === "selection_required") return { kind: "resolved", checkpoint, quietKey: buildOccasionQuietKey({ occurrenceKey: occurrence.occurrenceKey, personId: null, checkpoint }) };
  const preparation = await getOccasionPreparationForUser({ client: input.client, userId: input.userId, occurrenceKey: occurrence.occurrenceKey, now: input.now });
  if (preparation.kind === "resolved" && preparation.readiness.kind === "ready") return { kind: "ineligible" };
  return { kind: "resolved", checkpoint, quietKey: buildOccasionQuietKey({ occurrenceKey: occurrence.occurrenceKey, personId: people.personId, checkpoint }) };
}

export async function quietCurrentOccasion(input: { client: SupabaseClient; userId: string; occurrenceKey: string; disposition: QuietDisposition; now?: Date }): Promise<QuietResult & { resolution?: OccasionQuietResolution }> {
  const resolution = await resolveCurrentOccasionQuiet(input);
  if (resolution.kind !== "resolved") return resolution.kind === "not_found" ? { kind: "not_found" } : { kind: "conflict" };
  const result = await quietHappySemanticKey(input.userId, resolution.quietKey, input.disposition);
  return { ...result, resolution };
}
