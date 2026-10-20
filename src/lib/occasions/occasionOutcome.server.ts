import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { assistantLocalDate } from "../assistant/assistantLocalDate.ts";
import { getOccasionDefinition } from "./occasionRegistry.ts";
import { parseOccasionOccurrenceKey, resolveOccasionOccurrence } from "./occasionResolver.ts";
import { getOccasionCountry } from "./occasionCountry.repository.ts";
import { getSelectedOccasionPerson } from "./occasionPeople.repository.ts";
import { getEarlierLeadTimeProposal, resolvePostEventEligibility, type OccasionLeadTimeDays, normalizeOccasionLeadTime } from "../../../supabase/functions/happy-proactive/occasion-domain.ts";

export const OCCASION_OUTCOMES = ["went_well", "needed_more_time", "did_not_happen"] as const;
export type OccasionOutcome = (typeof OCCASION_OUTCOMES)[number];

export async function resolveOwnedPostEventOccurrence(input: {
  client: SupabaseClient;
  userId: string;
  occurrenceKey: string;
  now?: Date;
}): Promise<{ occasionKey: string; occurrenceKey: string; personId: string } | null> {
  const parsed = parseOccasionOccurrenceKey(input.occurrenceKey);
  if (!parsed) return null;
  const definition = getOccasionDefinition(parsed.occasionKey);
  if (!definition || (await getOccasionCountry(input.client, input.userId)) !== definition.countryCode) return null;
  const [{ data: preference, error }, personId] = await Promise.all([
    input.client.from("reminder_preferences").select("timezone").eq("user_id", input.userId).maybeSingle(),
    getSelectedOccasionPerson({ client: input.client, userId: input.userId, occurrenceKey: input.occurrenceKey }),
  ]);
  if (error || !personId) return null;
  const localDay = assistantLocalDate(input.now ?? new Date(), typeof preference?.timezone === "string" && preference.timezone.trim() ? preference.timezone : "UTC");
  const occurrence = resolveOccasionOccurrence({ definition, year: parsed.year, localDay });
  if (!occurrence || occurrence.occurrenceKey !== input.occurrenceKey) return null;
  return resolvePostEventEligibility({ localDay, occasionDate: occurrence.localDate, personId, existingOutcome: false })
    ? { occasionKey: definition.key, occurrenceKey: occurrence.occurrenceKey, personId }
    : null;
}

export async function saveOccasionOutcome(input: {
  client: SupabaseClient;
  userId: string;
  occurrenceKey: string;
  personId: string;
  outcome: OccasionOutcome;
}): Promise<{ outcome: OccasionOutcome; idempotent: boolean }> {
  const existing = await input.client.from("happy_occasion_outcomes")
    .select("outcome")
    .eq("user_id", input.userId)
    .eq("occurrence_key", input.occurrenceKey)
    .eq("person_id", input.personId)
    .maybeSingle();
  if (existing.error) throw new Error("occasion_outcome_unavailable");
  const idempotent = existing.data?.outcome === input.outcome;
  const { data, error } = await input.client.from("happy_occasion_outcomes")
    .upsert({ user_id: input.userId, occurrence_key: input.occurrenceKey, person_id: input.personId, outcome: input.outcome, updated_at: new Date().toISOString() }, { onConflict: "user_id,occurrence_key,person_id" })
    .select("outcome")
    .single();
  if (error || !OCCASION_OUTCOMES.includes(data?.outcome as OccasionOutcome)) throw new Error("occasion_outcome_unavailable");
  return { outcome: data.outcome as OccasionOutcome, idempotent };
}

export async function saveOccasionLeadTime(input: {
  client: SupabaseClient;
  userId: string;
  occasionKey: string;
  leadTimeDays: OccasionLeadTimeDays;
}): Promise<OccasionLeadTimeDays> {
  if (!getOccasionDefinition(input.occasionKey)) throw new Error("occasion_timing_invalid");
  const { data, error } = await input.client.from("happy_occasion_timing_preferences")
    .upsert({ user_id: input.userId, occasion_key: input.occasionKey, lead_time_days: input.leadTimeDays, updated_at: new Date().toISOString() }, { onConflict: "user_id,occasion_key" })
    .select("lead_time_days")
    .single();
  if (error) throw new Error("occasion_timing_unavailable");
  return normalizeOccasionLeadTime(data?.lead_time_days);
}

export async function getOccasionLeadTimeProposal(input: { client: SupabaseClient; userId: string; occasionKey: string }): Promise<OccasionLeadTimeDays | null> {
  const { data, error } = await input.client.from("happy_occasion_timing_preferences").select("lead_time_days").eq("user_id", input.userId).eq("occasion_key", input.occasionKey).maybeSingle();
  if (error) throw new Error("occasion_timing_unavailable");
  return getEarlierLeadTimeProposal(normalizeOccasionLeadTime(data?.lead_time_days));
}
