import type { HappyAgentIntent } from "./happyAgentIntentContext.types";

export type HappyAgentIntentBudget = {
  likes: number;
  dislikes: number;
  interests: number;
  importantFacts: number;
  memories: number;
  previousGifts: number;
  plannedGifts: number;
  tasks: number;
  ideas: number;
  actions: number;
  taskTypes: readonly string[];
  ideaTypes: readonly string[];
};

/**
 * Structural, not token-based, limits. Values stay deliberately small so an
 * intent receives only its useful canonical context.
 */
export const HAPPY_AGENT_INTENT_BUDGETS: Readonly<Record<HappyAgentIntent, HappyAgentIntentBudget>> = {
  birthday_gift: {
    likes: 8, dislikes: 5, interests: 8, importantFacts: 5, memories: 5,
    previousGifts: 5, plannedGifts: 5, tasks: 3, ideas: 3, actions: 3,
    taskTypes: ["birthday_gift"],
    ideaTypes: ["gift", "birthday_gift"],
  },
  write_greeting: {
    likes: 2, dislikes: 1, interests: 2, importantFacts: 5, memories: 10,
    previousGifts: 0, plannedGifts: 0, tasks: 1, ideas: 0, actions: 2,
    taskTypes: ["write_greeting"],
    ideaTypes: [],
  },
};
