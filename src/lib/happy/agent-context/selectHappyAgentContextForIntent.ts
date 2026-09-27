import { HAPPY_AGENT_INTENT_BUDGETS } from "./happyAgentContextBudget.ts";
import type { HappyAgentIntent, HappyAgentIntentContext, HappyAgentIntentSelectionResult } from "./happyAgentIntentContext.types";
import type { HappyAgentActionItem, HappyAgentContext, HappyAgentKnowledgeItem, HappyAgentTaskItem } from "./happyAgentContext.types";

const supported = (intent: string): intent is HappyAgentIntent => intent === "birthday_gift" || intent === "write_greeting";
const newestFirst = <T extends { id: string; createdAt: string }>(items: readonly T[]) => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
const knowledgeOrder = (items: readonly HappyAgentKnowledgeItem[]) => [...items].sort((a, b) => b.importance - a.importance || (b.occurredOn ?? "").localeCompare(a.occurredOn ?? "") || a.id.localeCompare(b.id));
const taskOrder = (items: readonly HappyAgentTaskItem[]) => {
  const statusRank: Record<string, number> = { waiting_user: 0, active: 1, paused: 2 };
  return [...items].sort((a, b) => (statusRank[a.status] ?? 3) - (statusRank[b.status] ?? 3) || b.startedAt.localeCompare(a.startedAt) || a.id.localeCompare(b.id));
};
const actionOrder = (items: readonly HappyAgentActionItem[]) => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
const addIfNonEmpty = <T>(target: Record<string, T[]>, key: string, values: T[]) => { if (values.length) target[key] = values; };

/**
 * Pure, owner-scope-preserving projection. It performs no I/O and never
 * expands the canonical input context; unknown runtime strings fail closed.
 */
export function selectHappyAgentContextForIntent(context: HappyAgentContext, intent: HappyAgentIntent | string): HappyAgentIntentSelectionResult {
  if (!supported(intent)) return { kind: "unsupported_intent", intent };
  const budget = HAPPY_AGENT_INTENT_BUDGETS[intent];
  const projected: HappyAgentIntentContext = { intent, user: { locale: context.user.locale, timezone: context.user.timezone } };
  if (context.person) projected.person = { ...context.person };
  if (context.event) projected.event = { ...context.event };

  const knowledge: Record<string, HappyAgentKnowledgeItem[]> = {};
  addIfNonEmpty(knowledge, "likes", knowledgeOrder(context.knowledge.likes).slice(0, budget.likes));
  addIfNonEmpty(knowledge, "dislikes", knowledgeOrder(context.knowledge.dislikes).slice(0, budget.dislikes));
  addIfNonEmpty(knowledge, "interests", knowledgeOrder(context.knowledge.interests).slice(0, budget.interests));
  addIfNonEmpty(knowledge, "importantFacts", knowledgeOrder(context.knowledge.importantFacts).slice(0, budget.importantFacts));
  if (Object.keys(knowledge).length) projected.knowledge = knowledge;

  const memories = context.memories.slice(0, budget.memories);
  if (memories.length) projected.memories = memories;

  const gifts: Record<string, typeof context.gifts.previous> = {};
  addIfNonEmpty(gifts, "previous", newestFirst(context.gifts.previous).slice(0, budget.previousGifts));
  addIfNonEmpty(gifts, "planned", newestFirst(context.gifts.planned).slice(0, budget.plannedGifts));
  if (Object.keys(gifts).length) projected.gifts = gifts;

  const tasks = taskOrder(context.activeTasks.filter((task) => budget.taskTypes.includes(task.type) && ["active", "waiting_user", "paused"].includes(task.status))).slice(0, budget.tasks);
  if (tasks.length) projected.activeTasks = tasks;
  const selectedTaskIds = new Set(tasks.map((task) => task.id));
  const ideas = newestFirst(context.activeIdeas.filter((idea) => budget.ideaTypes.includes(idea.type))).slice(0, budget.ideas);
  if (ideas.length) projected.activeIdeas = ideas;
  const actions = actionOrder(context.recentActions.filter((action) => action.taskId !== null && selectedTaskIds.has(action.taskId))).slice(0, budget.actions);
  if (actions.length) projected.recentActions = actions;
  return { kind: "ok", context: projected };
}
