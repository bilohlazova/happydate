import type { HappyAgentActionItem, HappyAgentContext, HappyAgentGiftItem, HappyAgentTaskItem } from "./happyAgentContext.types";
export const HAPPY_AGENT_LIMITS = { gifts: 10, tasks: 10, ideas: 10, actions: 10, memories: 12, knowledge: 20 } as const;
export function daysUntil(date: string, now: Date): number { const start = new Date(now.toISOString().slice(0, 10)); const target = new Date(`${date}T00:00:00.000Z`); return Math.round((target.getTime() - start.getTime()) / 86_400_000); }
export function activeTasks(items: HappyAgentTaskItem[]) { return items.filter((item) => ["active", "waiting_user", "paused"].includes(item.status)).slice(0, HAPPY_AGENT_LIMITS.tasks); }
export function gifts(items: HappyAgentGiftItem[]) { return { previous: items.filter((item) => item.lifecycle === "given").slice(0, HAPPY_AGENT_LIMITS.gifts), planned: items.filter((item) => item.lifecycle !== "given").slice(0, HAPPY_AGENT_LIMITS.gifts) }; }
export function recentActions(items: HappyAgentActionItem[]) { return [...items].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, HAPPY_AGENT_LIMITS.actions); }
export function emptyContext(user: HappyAgentContext["user"]): HappyAgentContext { return { user, knowledge: { likes: [], dislikes: [], interests: [], importantFacts: [] }, memories: [], gifts: { previous: [], planned: [] }, activeTasks: [], activeIdeas: [], recentActions: [] }; }
