import type { RescueResult } from "./occasionRescue.ts";
import type { OccasionPhase } from "./occasion.types.ts";
import type { RescueMissingComponent } from "./occasionRescue.ts";

export type OccasionRescueProviderInput = {
  occasionKey: "pl_boys_day";
  occurrenceKey: string;
  phase: Extract<OccasionPhase, "urgent" | "today">;
  person: { id: string; name: string; relationKey: string | null };
  missing: readonly RescueMissingComponent[];
  locale: string;
  signal?: AbortSignal;
};
export type OccasionRescueProvider = (input: OccasionRescueProviderInput) => Promise<unknown>;
export type OccasionRescueResponse = RescueResult;
