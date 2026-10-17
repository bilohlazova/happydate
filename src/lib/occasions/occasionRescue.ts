import { z } from "zod";
import type { OccasionPhase } from "./occasion.types.ts";
import type { OccasionReadiness } from "./occasionPreparation.ts";
import { isOccasionRescueEligible as isSharedOccasionRescueEligible } from "../../../supabase/functions/happy-proactive/occasion-domain.ts";

export const rescueSuggestionCategories = ["quick_gift", "digital", "voucher", "experience", "greeting", "plan_b", "delayed_gift"] as const;
export type RescueSuggestionCategory = (typeof rescueSuggestionCategories)[number];
export type RescueMissingComponent = "gift" | "greeting" | "preparation";

export type OccasionRescueEligibility =
  | { readonly kind: "ineligible"; readonly reason: "phase" | "ready" | "no_person" | "selection_required" }
  | { readonly kind: "eligible"; readonly rescueKey: string; readonly missing: readonly RescueMissingComponent[] };

/** A stable identity for a factual rescue situation, never for generated text. */
export function occasionRescueKey(occurrenceKey: string, personId: string): string {
  if (!/^occasion:[a-z][a-z0-9_]*:\d{4}$/.test(occurrenceKey) || !personId.trim()) throw new TypeError("Invalid Rescue identity");
  return `${occurrenceKey}:${personId}`;
}

/** Deterministic boundary: AI never participates in eligibility or missing facts. */
export function resolveOccasionRescueEligibility(input: {
  occurrenceKey: string;
  personId: string | null;
  recipientResolution: "resolved" | "selection_required" | "none";
  phase: OccasionPhase | null;
  readiness: OccasionReadiness | undefined;
}): OccasionRescueEligibility {
  if (input.recipientResolution === "selection_required") return { kind: "ineligible", reason: "selection_required" };
  if (input.recipientResolution === "none" || !input.personId) return { kind: "ineligible", reason: "no_person" };
  if (input.phase !== "urgent" && input.phase !== "today") return { kind: "ineligible", reason: "phase" };
  if (!input.readiness || input.readiness.kind === "ready") return { kind: "ineligible", reason: "ready" };
  if (!isSharedOccasionRescueEligible({ phase: input.phase, personId: input.personId, recipientResolution: input.recipientResolution, readiness: input.readiness.kind })) return { kind: "ineligible", reason: "ready" };
  return { kind: "eligible", rescueKey: occasionRescueKey(input.occurrenceKey, input.personId), missing: input.readiness.missing };
}

export const rescueSuggestionSchema = z.object({
  category: z.enum(rescueSuggestionCategories),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(600),
  whyItFits: z.string().trim().min(1).max(300).optional(),
}).strict();

export const rescueResultSchema = z.object({
  suggestions: z.array(rescueSuggestionSchema).min(3).max(5),
}).strict();
export type RescueResult = z.infer<typeof rescueResultSchema>;

