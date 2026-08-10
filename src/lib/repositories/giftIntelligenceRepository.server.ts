import { createClient } from "@supabase/supabase-js";
import type { KnowledgeItem } from "@/lib/knowledge";
import { listKnowledgeForOwnedPersonOnServer } from "./knowledgeRepository";
import { mapOwnedGiftPersonRow, type OwnedGiftPersonRow } from "./giftPersonMapper";
import type {
  PersonGender,
  PersonRelationKey,
} from "./person.types";
import type { GiftOutcomeValue } from "../gifts/gift.types";

export interface OwnedGiftPerson {
  id: string;
  userId: string;
  name: string | null;
  relation: string | null;
  relationKey: PersonRelationKey | null;
  gender: PersonGender;
  birthday: string | null;
}

export interface GiftIntelligenceSource {
  person: OwnedGiftPerson;
  knowledge: KnowledgeItem[];
  outcomeLearningEnabled: boolean;
  confirmedGiftOutcomes: Array<{
    giftId: string;
    giftTitle: string;
    outcome: GiftOutcomeValue;
    note: string | null;
    confirmedAt: string;
  }>;
}

export class GiftIntelligenceRepositoryError extends Error {
  readonly code: "gift_person_lookup_failed";
  readonly cause?: unknown;

  constructor(
    code: "gift_person_lookup_failed",
    cause?: unknown,
  ) {
    super(code);
    this.code = code;
    this.cause = cause;
  }
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function findOwnedGiftPerson(
  userId: string,
  personId: string,
): Promise<OwnedGiftPerson | null> {
  const { data, error } = await adminClient()
    .from("people")
    .select("id, user_id, name, relationship, relation_label, relation_key, gender, birthday")
    .eq("id", personId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new GiftIntelligenceRepositoryError("gift_person_lookup_failed", error);
  }
  return data ? mapOwnedGiftPersonRow(data as OwnedGiftPersonRow) : null;
}

export async function getCachedGiftIdeas(person: OwnedGiftPerson, occasion: string) {
  const { data, error } = await adminClient()
    .from("ai_gift_cache")
    .select("ideas")
    .eq("person_id", person.id)
    .eq("occasion", occasion)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return !error && data?.ideas ? data.ideas : null;
}

export async function loadGiftIntelligenceSource(
  person: OwnedGiftPerson,
): Promise<GiftIntelligenceSource> {
  const client = adminClient();
  const [knowledge, profileResult, giftsResult] = await Promise.all([
    listKnowledgeForOwnedPersonOnServer({ userId: person.userId, personId: person.id }),
    client.from("profiles")
      .select("gift_outcome_learning_enabled")
      .eq("id", person.userId)
      .maybeSingle(),
    client.from("gifts")
      .select("id, title, recipient_reaction, recipient_reaction_note, recipient_reaction_confirmed_at, recipient_reaction_learning_enabled")
      .eq("user_id", person.userId)
      .eq("person_id", person.id)
      .eq("lifecycle", "given")
      .not("recipient_reaction", "is", null)
      .eq("recipient_reaction_learning_enabled", true)
      .order("recipient_reaction_confirmed_at", { ascending: false }),
  ]);
  if (profileResult.error || giftsResult.error) {
    throw new GiftIntelligenceRepositoryError(
      "gift_person_lookup_failed",
      profileResult.error ?? giftsResult.error,
    );
  }
  const outcomeLearningEnabled = profileResult.data?.gift_outcome_learning_enabled !== false;
  return {
    person,
    knowledge,
    outcomeLearningEnabled,
    confirmedGiftOutcomes: outcomeLearningEnabled
      ? (giftsResult.data ?? []).flatMap((gift) =>
          gift.recipient_reaction && gift.recipient_reaction_confirmed_at ? [{
            giftId: gift.id,
            giftTitle: gift.title,
            outcome: gift.recipient_reaction as GiftOutcomeValue,
            note: gift.recipient_reaction_note,
            confirmedAt: gift.recipient_reaction_confirmed_at,
          }] : [])
      : [],
  };
}

export async function saveGiftIdeas(
  person: OwnedGiftPerson,
  occasion: string,
  ideas: unknown,
): Promise<void> {
  await adminClient().from("ai_gift_cache").upsert(
    {
      person_id: person.id,
      occasion,
      ideas,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "person_id,occasion" },
  );
}
