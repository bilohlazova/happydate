import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabasePublicConfig } from "../supabase/publicConfig.ts";
import type { PersonRelationKey } from "../repositories/person.types.ts";
import type { OccasionDefinition, OccasionOccurrence } from "./occasion.types.ts";
import { getOccasionDefinition } from "./occasionRegistry.ts";
import { occasionOccurrenceKey } from "./occasionResolver.ts";
import { resolveRelevantPeopleFromProjection } from "./occasionPeopleResolver.ts";
import type { OccasionPeopleResolution, OccasionPersonProjection } from "./occasionPeople.types.ts";

export const OCCASION_PEOPLE_SELECT = "id, user_id, name, relation_key, gender";

const RELATION_KEYS = new Set<PersonRelationKey>([
  "spouse", "partner", "parent", "child", "sibling", "close_friend", "friend",
  "family", "work", "acquaintance", "neighbor", "client", "other",
]);

function normalizeGender(value: unknown): OccasionPersonProjection["gender"] {
  if (value === "female" || value === "male" || value === "other") return value;
  return null;
}

function projectPerson(row: Record<string, unknown>): OccasionPersonProjection {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: typeof row.name === "string" ? row.name : "",
    relationKey: typeof row.relation_key === "string" && RELATION_KEYS.has(row.relation_key as PersonRelationKey)
      ? row.relation_key as PersonRelationKey
      : null,
    gender: normalizeGender(row.gender),
  };
}

export async function listOwnedOccasionPeople(
  client: SupabaseClient,
  userId: string,
): Promise<readonly OccasionPersonProjection[]> {
  const { data, error } = await client
    .from("people")
    .select(OCCASION_PEOPLE_SELECT)
    .eq("user_id", userId)
    .order("name", { ascending: true })
    .limit(100);
  if (error) throw new Error("occasion_people_unavailable");
  return (data ?? []).map((row) => projectPerson(row as Record<string, unknown>));
}

export function createTrustedOccasionClient(): SupabaseClient | null {
  const config = readSupabasePublicConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return config && key
    ? createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    : null;
}

export async function getSelectedOccasionPerson(input: {
  client: SupabaseClient;
  userId: string;
  occurrenceKey: string;
}): Promise<string | null> {
  const { data, error } = await input.client
    .from("happy_occasion_targets")
    .select("person_id")
    .eq("user_id", input.userId)
    .eq("occurrence_key", input.occurrenceKey)
    .maybeSingle();
  if (error) throw new Error("occasion_target_unavailable");
  return typeof data?.person_id === "string" ? data.person_id : null;
}

export async function resolveOwnedOccasionPeople(input: {
  client: SupabaseClient;
  userId: string;
  definition: OccasionDefinition;
  occurrenceKey: string;
}): Promise<OccasionPeopleResolution> {
  const selected = await getSelectedOccasionPerson(input);
  if (selected) return { kind: "resolved", occasionKey: input.definition.key, occurrenceKey: input.occurrenceKey, personId: selected };
  const people = await listOwnedOccasionPeople(input.client, input.userId);
  return resolveRelevantPeopleFromProjection({ definition: input.definition, occurrenceKey: input.occurrenceKey, people });
}

/**
 * Canonical server boundary for a previously resolved Block-45 occurrence.
 * The caller must provide the trusted occurrence object; the definition and
 * stable key are checked again before any People read is used.
 */
export async function resolveRelevantPeopleForOccasion(input: {
  client: SupabaseClient;
  userId: string;
  occurrence: OccasionOccurrence;
}): Promise<OccasionPeopleResolution> {
  const definition = getOccasionDefinition(input.occurrence.occasionKey);
  if (!definition || definition.countryCode !== input.occurrence.countryCode
    || occasionOccurrenceKey(input.occurrence.occasionKey, input.occurrence.year) !== input.occurrence.occurrenceKey) {
    return { kind: "none", occasionKey: input.occurrence.occasionKey, occurrenceKey: input.occurrence.occurrenceKey };
  }
  return resolveOwnedOccasionPeople({
    client: input.client,
    userId: input.userId,
    definition,
    occurrenceKey: input.occurrence.occurrenceKey,
  });
}

export async function saveSelectedOccasionPerson(input: {
  client: SupabaseClient;
  userId: string;
  occasionKey: string;
  occurrenceKey: string;
  personId: string;
}): Promise<{ personId: string; idempotent: boolean }> {
  const existing = await input.client.from("happy_occasion_targets")
    .select("person_id")
    .eq("user_id", input.userId)
    .eq("occurrence_key", input.occurrenceKey)
    .maybeSingle();
  if (existing.error) throw new Error("occasion_target_unavailable");
  if (existing.data?.person_id === input.personId) return { personId: input.personId, idempotent: true };

  const { data, error } = await input.client
    .from("happy_occasion_targets")
    .upsert({ user_id: input.userId, occasion_key: input.occasionKey, occurrence_key: input.occurrenceKey, person_id: input.personId, updated_at: new Date().toISOString() }, { onConflict: "user_id,occurrence_key" })
    .select("person_id")
    .single();
  if (error || typeof data?.person_id !== "string") throw new Error("occasion_target_unavailable");
  return { personId: data.person_id, idempotent: false };
}

