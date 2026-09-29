import type { HomeHappyAction, HomeHappyIdea, HomeStoredEvent } from "../../home/home.types.ts";
import type { HappyTaskCardModel, HappyTaskCardSource } from "../task-ui/happyTaskCard.ts";
import type { HappyUIBlock } from "../ui/happyUIBlock.ts";

export type HomePrimaryHappyBlock =
  | { type: "approval"; action: HomeHappyAction; block: Extract<HappyUIBlock, { type: "approval" }> }
  | { type: "task_progress"; task: HappyTaskCardModel; block: Extract<HappyUIBlock, { type: "task_progress" }> }
  | { type: "idea"; idea: HomeHappyIdea; priority: "high" | "normal"; block: Extract<HappyUIBlock, { type: "idea" }> };

export interface PrimaryHappyBlockContext {
  userId: string | null | undefined;
  now: Date;
  actions: readonly HomeHappyAction[];
  tasks: readonly HappyTaskCardSource[];
  ideas: readonly HomeHappyIdea[];
  events: readonly Pick<HomeStoredEvent, "id" | "date">[];
}
