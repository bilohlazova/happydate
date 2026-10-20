import type { HomeHappyAction, HomeHappyIdea, HomeStoredEvent } from "../../home/home.types.ts";
import type { HappyTaskCardModel, HappyTaskCardSource } from "../task-ui/happyTaskCard.ts";
import type { HappyUIBlock } from "../ui/happyUIBlock.ts";
import type { ProactivityMode } from "../../../../supabase/functions/happy-proactive/proactivity-policy.ts";
import type { OccasionSignal, RescueSignal } from "../signals/happySignal.types.ts";

export type HomeOccasionBlock = {
  type: "occasion";
  occasionKey: string;
  occurrenceKey: string;
  phase: OccasionSignal["phase"];
  recipientResolution: OccasionSignal["recipientResolution"];
  personId: string | null;
  candidates: OccasionSignal["candidates"];
  readiness: OccasionSignal["readiness"];
};

export type HomePrimaryHappyBlock =
  | { type: "approval"; action: HomeHappyAction; block: Extract<HappyUIBlock, { type: "approval" }> }
  | { type: "task_progress"; task: HappyTaskCardModel; block: Extract<HappyUIBlock, { type: "task_progress" }> }
  | { type: "idea"; idea: HomeHappyIdea; priority: "high" | "normal"; block: Extract<HappyUIBlock, { type: "idea" }> }
  | { type: "occasion"; signal: OccasionSignal; block: HomeOccasionBlock }
  | { type: "rescue"; signal: RescueSignal; block: { type: "rescue"; occurrenceKey: string; personId: string; missing: RescueSignal["missing"] } };

export interface PrimaryHappyBlockContext {
  userId: string | null | undefined;
  now: Date;
  actions: readonly HomeHappyAction[];
  tasks: readonly HappyTaskCardSource[];
  ideas: readonly HomeHappyIdea[];
  events: readonly Pick<HomeStoredEvent, "id" | "date">[];
  occasionSignals?: readonly OccasionSignal[];
  rescueSignals?: readonly RescueSignal[];
  /** Optional current mode; omitted for legacy callers and treated as active. */
  proactivityMode?: ProactivityMode;
}
