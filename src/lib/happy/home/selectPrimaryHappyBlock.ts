import { daysUntil } from "../agent-context/happyAgentContext.selectors.ts";
import { happyToolRequiresApproval } from "../tools/happyTools.ts";
import { selectPrimaryHappyTask } from "../task-ui/happyTaskCard.ts";
import { taskProgressBlockFromCard } from "../ui/happyUIBlock.ts";
import type { HomeHappyIdea } from "../../home/home.types.ts";
import type { HomePrimaryHappyBlock, PrimaryHappyBlockContext } from "./primaryHappyBlock.types.ts";

function ideaPriority(idea: HomeHappyIdea, events: PrimaryHappyBlockContext["events"], now: Date): "high" | "normal" {
  if (idea.type === "prepare_greeting") return "high";
  if (idea.type !== "gift_help" || !idea.eventId) return "normal";
  const event = events.find((candidate) => candidate.id === idea.eventId);
  const remaining = event ? daysUntil(event.date, now) : null;
  return remaining !== null && remaining >= 0 && remaining <= 7 ? "high" : "normal";
}

function selectIdea(context: PrimaryHappyBlockContext): HomePrimaryHappyBlock | null {
  const owner = context.userId;
  if (!owner) return null;
  const eligible = context.ideas
    .filter((idea) => idea.userId === owner && (idea.status === "new" || idea.status === "shown"))
    .map((idea) => ({ idea, priority: ideaPriority(idea, context.events, context.now) }))
    .sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "high" ? -1 : 1)
      || a.idea.createdAt.localeCompare(b.idea.createdAt)
      || a.idea.id.localeCompare(b.idea.id));
  const candidate = eligible[0];
  return candidate ? {
    type: "idea",
    idea: candidate.idea,
    priority: candidate.priority,
    block: { type: "idea", ideaId: candidate.idea.id, title: candidate.idea.title, message: candidate.idea.message, actions: ["accept", "dismiss"] },
  } : null;
}

/**
 * Pure, deterministic Home priority: approval > canonical task > high idea > normal idea.
 * Data is already owner-scoped by the repository; the explicit owner checks are a second
 * boundary against accidental mixed input.
 */
export function selectPrimaryHappyBlock(context: PrimaryHappyBlockContext): HomePrimaryHappyBlock | null {
  const owner = context.userId;
  if (!owner) return null;
  const action = context.actions
    .filter((candidate) => candidate.userId === owner && candidate.status === "pending" && happyToolRequiresApproval(candidate.type) === true)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0];
  if (action) return {
    type: "approval",
    action,
    block: { type: "approval", actionId: action.id, actionType: action.type, summary: action.type, actions: ["approve", "reject"] },
  };

  const task = selectPrimaryHappyTask(context.tasks.filter((candidate) => candidate.userId === owner), context.now);
  if (task) return { type: "task_progress", task, block: taskProgressBlockFromCard(task) };
  return selectIdea(context);
}
