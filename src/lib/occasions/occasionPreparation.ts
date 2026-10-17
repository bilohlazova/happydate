import type { GiftLifecycle } from "../gifts/gift.types.ts";
import { resolveOccasionReadiness as resolveSharedOccasionReadiness } from "../../../supabase/functions/happy-proactive/occasion-domain.ts";

export type OccasionGiftPreparationFacts = {
  readonly lifecycle: GiftLifecycle | null;
  readonly hasIdea: boolean;
  readonly hasSelected: boolean;
  readonly hasPurchased: boolean;
  readonly hasGiven: boolean;
  readonly satisfiesGiftRequirement: boolean;
};

export type OccasionGreetingFacts = { readonly status: "missing" | "prepared" };
export type OccasionPreparationFacts = { readonly status: "not_started" | "in_progress" | "completed" };
export type OccasionPreparationPolicy = {
  readonly requiresGift: true;
  readonly requiresGreeting: true;
  readonly requiresPreparation: true;
  readonly minimumGiftLifecycle: "selected";
};

export const PL_BOYS_DAY_PREPARATION_POLICY: OccasionPreparationPolicy = {
  requiresGift: true,
  requiresGreeting: true,
  requiresPreparation: true,
  minimumGiftLifecycle: "selected",
};

export type OccasionReadiness =
  | { readonly kind: "needs_action"; readonly missing: readonly ("gift" | "greeting" | "preparation")[] }
  | { readonly kind: "in_progress"; readonly missing: readonly ("gift" | "greeting" | "preparation")[] }
  | { readonly kind: "ready" };

const GIFT_RANK: Record<GiftLifecycle, number> = { idea: 1, selected: 2, purchased: 3, given: 4 };

export function deriveOccasionGiftFacts(input: {
  lifecycle: GiftLifecycle | null;
}): OccasionGiftPreparationFacts {
  const lifecycle = input.lifecycle;
  const rank = lifecycle ? GIFT_RANK[lifecycle] : 0;
  return {
    lifecycle,
    hasIdea: lifecycle === "idea",
    hasSelected: lifecycle === "selected",
    hasPurchased: lifecycle === "purchased",
    hasGiven: lifecycle === "given",
    satisfiesGiftRequirement: rank >= GIFT_RANK.selected,
  };
}

export function resolveOccasionPreparationReadiness(input: {
  gift: OccasionGiftPreparationFacts;
  greeting: OccasionGreetingFacts;
  preparation: OccasionPreparationFacts;
  policy?: OccasionPreparationPolicy;
}): OccasionReadiness {
  const policy = input.policy ?? PL_BOYS_DAY_PREPARATION_POLICY;
  return resolveSharedOccasionReadiness({
    giftReady: !policy.requiresGift || input.gift.satisfiesGiftRequirement,
    greetingReady: !policy.requiresGreeting || input.greeting.status === "prepared",
    preparationStatus: !policy.requiresPreparation ? "completed" : input.preparation.status,
  });
}
