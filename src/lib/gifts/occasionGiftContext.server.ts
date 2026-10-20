import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserOccasionsForLocalDay, parseOccasionOccurrenceKey } from "../occasions/occasionResolver.ts";
import { getOccasionDefinition } from "../occasions/occasionRegistry.ts";
import { resolveOwnedOccasionPeople } from "../occasions/occasionPeople.repository.ts";
import type { GiftLifecycle, GiftRecord } from "./gift.types.ts";
import { listCanonicalGiftsForContextWithClient } from "./gift.persistence.ts";
import { buildOccasionGiftContextFromOccurrence, type OccasionGiftContext } from "./occasionGiftContext.ts";

export type OccasionGiftContextUnavailableReason = "no_person" | "selection_required";

export type OccasionGiftLifecycleSummary = {
  readonly hasIdea: boolean;
  readonly hasSelected: boolean;
  readonly hasPurchased: boolean;
  readonly hasGiven: boolean;
  readonly highestLifecycle: GiftLifecycle | null;
};

export type OccasionGiftContextResult =
  | { readonly kind: "unavailable"; readonly reason: OccasionGiftContextUnavailableReason }
  | {
      readonly kind: "resolved";
      readonly occasionKey: string;
      readonly occurrenceKey: string;
      readonly personId: string;
      readonly giftContextKey: OccasionGiftContext;
      readonly gifts: readonly GiftRecord[];
      readonly lifecycleSummary: OccasionGiftLifecycleSummary;
    };

const LIFECYCLE_RANK: Record<GiftLifecycle, number> = { idea: 1, selected: 2, purchased: 3, given: 4 };

function summarize(gifts: readonly GiftRecord[]): OccasionGiftLifecycleSummary {
  let highestLifecycle: GiftLifecycle | null = null;
  for (const gift of gifts) {
    if (!highestLifecycle || LIFECYCLE_RANK[gift.lifecycle] > LIFECYCLE_RANK[highestLifecycle]) highestLifecycle = gift.lifecycle;
  }
  return {
    hasIdea: gifts.some((gift) => gift.lifecycle === "idea"),
    hasSelected: gifts.some((gift) => gift.lifecycle === "selected"),
    hasPurchased: gifts.some((gift) => gift.lifecycle === "purchased"),
    hasGiven: gifts.some((gift) => gift.lifecycle === "given"),
    highestLifecycle,
  };
}

/**
 * Read-only owner-scoped Occasion Gift context. The caller supplies a client
 * whose identity is already trusted (authenticated RLS or service role).
 * Occasion, year and person are all re-derived before the exact Gift query.
 */
export async function getOccasionGiftContextForUser(input: {
  client: SupabaseClient;
  userId: string;
  occurrenceKey: string;
  now?: Date;
}): Promise<OccasionGiftContextResult> {
  const parsed = parseOccasionOccurrenceKey(input.occurrenceKey);
  if (!parsed || !getOccasionDefinition(parsed.occasionKey)) return { kind: "unavailable", reason: "no_person" };

  const occurrences = await getUserOccasionsForLocalDay({ client: input.client, userId: input.userId, now: input.now });
  const occurrence = occurrences.find((candidate) => candidate.occurrenceKey === input.occurrenceKey);
  if (!occurrence) return { kind: "unavailable", reason: "no_person" };

  const definition = getOccasionDefinition(occurrence.occasionKey);
  if (!definition) return { kind: "unavailable", reason: "no_person" };
  const resolution = await resolveOwnedOccasionPeople({
    client: input.client,
    userId: input.userId,
    definition,
    occurrenceKey: occurrence.occurrenceKey,
  });
  if (resolution.kind === "none") return { kind: "unavailable", reason: "no_person" };
  if (resolution.kind === "selection_required") return { kind: "unavailable", reason: "selection_required" };

  const giftContextKey = buildOccasionGiftContextFromOccurrence(occurrence, resolution.personId);
  const gifts = await listCanonicalGiftsForContextWithClient(input.client, {
    userId: input.userId,
    personId: resolution.personId,
    contextKey: giftContextKey,
  });
  return {
    kind: "resolved",
    occasionKey: occurrence.occasionKey,
    occurrenceKey: occurrence.occurrenceKey,
    personId: resolution.personId,
    giftContextKey,
    gifts,
    lifecycleSummary: summarize(gifts),
  };
}
