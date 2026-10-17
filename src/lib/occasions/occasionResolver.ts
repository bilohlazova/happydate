import { assistantLocalDate } from "../assistant/assistantLocalDate.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { compareDateOnly, daysBetweenDateOnly, isDateOnly, resolveOccasionDate, type DateOnly } from "./occasionDate.ts";
import { getOccasionDefinitionsForCountry } from "./occasionRegistry.ts";
import type { OccasionDefinition, OccasionOccurrence, OccasionPhase } from "./occasion.types.ts";
import { resolveOccasionPhase as resolveSharedOccasionPhase, normalizeOccasionLeadTime } from "../../../supabase/functions/happy-proactive/occasion-domain.ts";

export function resolveOccasionPhase(daysUntil: number, leadTimeDays: unknown = 7): OccasionPhase | null {
  return resolveSharedOccasionPhase(daysUntil, leadTimeDays);
}

export function occasionOccurrenceKey(occasionKey: string, year: number): string {
  if (!/^[a-z][a-z0-9_]*$/.test(occasionKey) || !Number.isInteger(year) || year < 1 || year > 9999) throw new TypeError("Invalid Occasion identity");
  return `occasion:${occasionKey}:${year}`;
}

export function parseOccasionOccurrenceKey(value: string): { occasionKey: string; year: number } | null {
  const match = /^occasion:([a-z][a-z0-9_]*):(\d{4})$/.exec(value);
  if (!match) return null;
  const year = Number(match[2]);
  return occasionOccurrenceKey(match[1], year) === value ? { occasionKey: match[1], year } : null;
}

export function resolveOccasionOccurrence(input: { definition: OccasionDefinition; year: number; localDay: string; leadTimeDays?: unknown }): OccasionOccurrence | null {
  if (!isDateOnly(input.localDay)) throw new TypeError("Invalid local calendar day");
  const localDate = resolveOccasionDate({ rule: input.definition.dateRule, year: input.year });
  if (!localDate) return null;
  const daysUntil = daysBetweenDateOnly(input.localDay as DateOnly, localDate);
  return {
    occasionKey: input.definition.key,
    occurrenceKey: occasionOccurrenceKey(input.definition.key, input.year),
    countryCode: input.definition.countryCode,
    localDate,
    year: input.year,
    daysUntil,
    phase: resolveOccasionPhase(daysUntil, input.leadTimeDays),
  };
}

export function resolveNextOccasionOccurrence(input: { definition: OccasionDefinition; localDay: string; leadTimeDays?: unknown }): OccasionOccurrence | null {
  if (!isDateOnly(input.localDay)) throw new TypeError("Invalid local calendar day");
  const localDay = input.localDay as DateOnly;
  const year = Number(localDay.slice(0, 4));
  const current = resolveOccasionOccurrence({ definition: input.definition, year, localDay, leadTimeDays: input.leadTimeDays });
  if (current && compareDateOnly(current.localDate as DateOnly, localDay) >= 0) return current;
  return resolveOccasionOccurrence({ definition: input.definition, year: year + 1, localDay, leadTimeDays: input.leadTimeDays });
}

export async function getUserOccasionsForLocalDay(input: { client: SupabaseClient; userId: string; now?: Date }): Promise<readonly OccasionOccurrence[]> {
  const [{ data: country, error: countryError }, { data: timezone, error: timezoneError }, { data: timing, error: timingError }] = await Promise.all([
    input.client.from("happy_occasion_preferences").select("country_code").eq("user_id", input.userId).maybeSingle(),
    input.client.from("reminder_preferences").select("timezone").eq("user_id", input.userId).maybeSingle(),
    input.client.from("happy_occasion_timing_preferences").select("occasion_key,lead_time_days").eq("user_id", input.userId),
  ]);
  if (countryError) throw new Error("occasion_country_unavailable");
  if (timezoneError) throw new Error("occasion_timezone_unavailable");
  if (timingError) throw new Error("occasion_timing_unavailable");
  const localDay = assistantLocalDate(input.now ?? new Date(), typeof timezone?.timezone === "string" && timezone.timezone.trim() ? timezone.timezone : "UTC");
  const timingByKey = new Map((timing ?? []).map((row) => [row.occasion_key, normalizeOccasionLeadTime(row.lead_time_days)]));
  return getOccasionDefinitionsForCountry(country?.country_code ?? null)
    .map((definition) => resolveNextOccasionOccurrence({ definition, localDay, leadTimeDays: timingByKey.get(definition.key) ?? 7 }))
    .filter((occurrence): occurrence is OccasionOccurrence => Boolean(occurrence));
}
