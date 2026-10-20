import { buildExistingHomeSignals } from "../signals/happySignalAdapters.ts";
import { getIdeaSignalPriority, selectPrimaryHappySignal } from "../signals/happySignalPriority.ts";
import { buildHappyTaskCardModel } from "../task-ui/happyTaskCard.ts";
import { taskProgressBlockFromCard } from "../ui/happyUIBlock.ts";
import type { HomePrimaryHappyBlock, PrimaryHappyBlockContext } from "./primaryHappyBlock.types.ts";

/**
 * Pure, deterministic Home projection over the shared Happy signal priority engine.
 * Data is already owner-scoped by the repository; the explicit owner checks are a
 * second boundary against accidental mixed input. New signal kinds are deliberately
 * not rendered by this legacy Home block until their owning presentation surface is
 * introduced.
 */
export function selectPrimaryHappyBlock(context: PrimaryHappyBlockContext): HomePrimaryHappyBlock | null {
  const owner = context.userId;
  if (!owner) return null;

  const signals = buildExistingHomeSignals({
    actions: context.actions.filter((candidate) => candidate.userId === owner),
    tasks: context.tasks.filter((candidate) => candidate.userId === owner),
    ideas: context.ideas.filter((candidate) => candidate.userId === owner),
    events: context.events,
    occasions: context.occasionSignals,
    rescues: context.rescueSignals,
    now: context.now,
    proactivityMode: context.proactivityMode,
  });
  const selected = selectPrimaryHappySignal(signals);
  if (!selected) return null;

  if (selected.kind === "pending_approval") {
    const action = context.actions.find((candidate) => candidate.userId === owner && candidate.id === selected.actionId && candidate.status === "pending");
    if (!action) return null;
    return {
      type: "approval",
      action,
      block: { type: "approval", actionId: action.id, actionType: action.type, summary: action.type, actions: ["approve", "reject"] },
    };
  }

  if (selected.kind === "task") {
    const source = context.tasks.find((candidate) => candidate.userId === owner && candidate.id === selected.taskId);
    const task = source ? buildHappyTaskCardModel(source, context.now) : null;
    return task ? { type: "task_progress", task, block: taskProgressBlockFromCard(task) } : null;
  }

  if (selected.kind === "idea") {
    const idea = context.ideas.find((candidate) => candidate.userId === owner && candidate.id === selected.ideaId
      && (candidate.status === "new" || candidate.status === "shown"));
    if (!idea) return null;
    return {
      type: "idea",
      idea,
      priority: getIdeaSignalPriority(selected),
      block: { type: "idea", ideaId: idea.id, title: idea.title, message: idea.message, actions: ["accept", "dismiss"] },
    };
  }

  if (selected.kind === "occasion") {
    return {
      type: "occasion",
      signal: selected,
      block: {
        type: "occasion",
        occasionKey: selected.occasionKey,
        occurrenceKey: selected.occurrenceKey,
        phase: selected.phase,
        recipientResolution: selected.recipientResolution,
        personId: selected.personId,
        candidates: selected.candidates,
        readiness: selected.readiness,
      },
    };
  }

  if (selected.kind === "rescue") {
    return { type: "rescue", signal: selected, block: { type: "rescue", occurrenceKey: selected.occurrenceKey, personId: selected.personId, missing: selected.missing } };
  }

  return null;
}
