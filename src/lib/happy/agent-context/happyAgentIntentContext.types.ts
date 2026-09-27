import type {
  HappyAgentActionItem,
  HappyAgentContext,
  HappyAgentGiftItem,
  HappyAgentIdeaItem,
  HappyAgentKnowledgeItem,
  HappyAgentMemoryItem,
  HappyAgentTaskItem,
} from "./happyAgentContext.types";

/** Trusted callers choose one of these explicit task intents. */
export type HappyAgentIntent = "birthday_gift" | "write_greeting";

export type HappyAgentIntentContext = {
  intent: HappyAgentIntent;
  user: Pick<HappyAgentContext["user"], "locale" | "timezone">;
  person?: HappyAgentContext["person"];
  event?: HappyAgentContext["event"];
  knowledge?: Partial<{
    likes: HappyAgentKnowledgeItem[];
    dislikes: HappyAgentKnowledgeItem[];
    interests: HappyAgentKnowledgeItem[];
    importantFacts: HappyAgentKnowledgeItem[];
  }>;
  memories?: HappyAgentMemoryItem[];
  gifts?: Partial<{ previous: HappyAgentGiftItem[]; planned: HappyAgentGiftItem[] }>;
  activeTasks?: HappyAgentTaskItem[];
  activeIdeas?: HappyAgentIdeaItem[];
  recentActions?: HappyAgentActionItem[];
};

export type HappyAgentIntentSelectionResult =
  | { kind: "ok"; context: HappyAgentIntentContext }
  | { kind: "unsupported_intent"; intent: string };
