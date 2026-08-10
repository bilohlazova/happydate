import { createClient } from "@supabase/supabase-js";
import type { GiftOutcomeValue } from "../gifts/gift.types.ts";
import { buildGiftOutcomeLearningSignals } from "../gift-intelligence/giftOutcomeLearningSignals.ts";
import type {
  GiftOutcomeCategorySignal,
  GiftRecommendationCategory,
} from "../gift-intelligence/giftIntelligence.types.ts";

export const ASSISTANT_GIFT_OUTCOME_LIMIT = 10;

export type AssistantGiftOutcomeContext = {
  giftTitle: string;
  outcome: GiftOutcomeValue;
  note: string | null;
  confirmedAt: string;
  category: GiftRecommendationCategory;
  categorySignal: GiftOutcomeCategorySignal;
};

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}

/**
 * Server-only consent and ownership boundary. Returns no evidence on any
 * uncertainty so Conversation Brain never receives unverified outcomes.
 */
export async function loadAssistantGiftOutcomeContext({
  userId,
  personId,
}: {
  userId: string;
  personId: string;
}): Promise<AssistantGiftOutcomeContext[]> {
  const client = adminClient();
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("gift_outcome_learning_enabled")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || profile?.gift_outcome_learning_enabled === false) return [];

  const { data, error } = await client
    .from("gifts")
    .select("title, recipient_reaction, recipient_reaction_note, recipient_reaction_confirmed_at")
    .eq("user_id", userId)
    .eq("person_id", personId)
    .eq("lifecycle", "given")
    .not("recipient_reaction", "is", null)
    .not("recipient_reaction_confirmed_at", "is", null)
    .eq("recipient_reaction_learning_enabled", true)
    .order("recipient_reaction_confirmed_at", { ascending: false })
    .limit(ASSISTANT_GIFT_OUTCOME_LIMIT);
  if (error) return [];

  const verified = (data ?? []).flatMap((row) => {
    const giftTitle = text(row.title, 240);
    const outcome = row.recipient_reaction;
    const confirmedAt = text(row.recipient_reaction_confirmed_at, 40);
    if (
      !giftTitle
      || !confirmedAt
      || (outcome !== "liked" && outcome !== "not_liked" && outcome !== "unsure")
    ) return [];
    const note = text(row.recipient_reaction_note, 500);
    return [{
      giftId: `${giftTitle}\u0000${confirmedAt}`,
      giftTitle,
      outcome,
      note,
      confirmedAt,
    }];
  });
  return buildGiftOutcomeLearningSignals(verified).map(({ giftId: _giftId, ...item }) => item);
}
