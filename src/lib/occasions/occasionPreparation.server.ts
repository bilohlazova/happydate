import type { SupabaseClient } from "@supabase/supabase-js";
import { getOccasionDefinition } from "./occasionRegistry.ts";
import { parseOccasionOccurrenceKey } from "./occasionResolver.ts";
import { getSelectedOccasionPerson } from "./occasionPeople.repository.ts";
import { getOccasionGiftContextForUser } from "../gifts/occasionGiftContext.server.ts";
import { resolveOccasionPreparationReadiness, deriveOccasionGiftFacts, type OccasionReadiness, type OccasionPreparationFacts, type OccasionGreetingFacts } from "./occasionPreparation.ts";

export type OccasionPreparationUnavailableReason = "no_person" | "selection_required";
export type OccasionPreparationResult =
  | { readonly kind: "unavailable"; readonly reason: OccasionPreparationUnavailableReason }
  | {
      readonly kind: "resolved";
      readonly occasionKey: string;
      readonly occurrenceKey: string;
      readonly personId: string;
      readonly gift: ReturnType<typeof deriveOccasionGiftFacts>;
      readonly greeting: OccasionGreetingFacts;
      readonly preparation: OccasionPreparationFacts;
      readonly readiness: OccasionReadiness;
    };

type PreparationRow = { status: string; greeting_content: string | null };

function normalizeStatus(value: unknown): OccasionPreparationFacts["status"] {
  return value === "in_progress" || value === "completed" ? value : "not_started";
}

export async function getOccasionPreparationForUser(input: {
  client: SupabaseClient;
  userId: string;
  occurrenceKey: string;
  now?: Date;
}): Promise<OccasionPreparationResult> {
  const gifts = await getOccasionGiftContextForUser(input);
  if (gifts.kind === "unavailable") return gifts;
  if (!getOccasionDefinition(gifts.occasionKey)) return { kind: "unavailable", reason: "no_person" };

  const { data, error } = await input.client
    .from("happy_occasion_preparations")
    .select("status,greeting_content")
    .eq("user_id", input.userId)
    .eq("occurrence_key", gifts.occurrenceKey)
    .eq("person_id", gifts.personId)
    .maybeSingle();
  if (error) throw new Error("occasion_preparation_unavailable");
  const row = (data ?? null) as PreparationRow | null;
  const preparation = { status: normalizeStatus(row?.status) } satisfies OccasionPreparationFacts;
  const greeting = { status: row?.greeting_content?.trim() ? "prepared" : "missing" } satisfies OccasionGreetingFacts;
  const gift = deriveOccasionGiftFacts({ lifecycle: gifts.lifecycleSummary.highestLifecycle });
  return {
    kind: "resolved",
    occasionKey: gifts.occasionKey,
    occurrenceKey: gifts.occurrenceKey,
    personId: gifts.personId,
    gift,
    greeting,
    preparation,
    readiness: resolveOccasionPreparationReadiness({ gift, greeting, preparation }),
  };
}

/** Trusted server-only factual write; readiness is never accepted from callers. */
export async function upsertOccasionPreparationFacts(input: {
  client: SupabaseClient;
  userId: string;
  occurrenceKey: string;
  occasionKey: string;
  personId: string;
  status?: OccasionPreparationFacts["status"];
  greetingContent?: string | null;
}) {
  const parsed = parseOccasionOccurrenceKey(input.occurrenceKey);
  if (!parsed || parsed.occasionKey !== input.occasionKey || !getOccasionDefinition(parsed.occasionKey)) {
    throw new Error("occasion_preparation_write_failed");
  }
  const selectedPersonId = await getSelectedOccasionPerson({ client: input.client, userId: input.userId, occurrenceKey: input.occurrenceKey });
  if (selectedPersonId !== input.personId) throw new Error("occasion_preparation_write_failed");
  const { data, error } = await input.client
    .from("happy_occasion_preparations")
    .upsert({
      user_id: input.userId,
      occasion_key: input.occasionKey,
      occurrence_key: input.occurrenceKey,
      person_id: input.personId,
      ...(input.status ? { status: input.status } : {}),
      ...(input.greetingContent !== undefined ? { greeting_content: input.greetingContent } : {}),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,occurrence_key,person_id" })
    .select("id,status,greeting_content")
    .single();
  if (error || !data) throw new Error("occasion_preparation_write_failed");
  return { id: data.id, status: normalizeStatus(data.status), greetingContent: data.greeting_content ?? null };
}
