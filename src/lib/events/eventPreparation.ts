import { hasMatchingBirthdayGift, resolveBirthdayUrgency } from "../birthday/birthdayPresentation.ts";

export type EventPreparationEvent = {
  id: string;
  title: string;
  date: string;
  category: string | null;
  personId: string | null;
  personBirthYear?: number | null;
  daysUntil?: number | null;
};

export type EventPreparationGift = {
  personId: string | null;
  eventId: string | null;
  lifecycle: string;
};

export type EventPreparationTask = {
  id: string;
  type: string;
  status: string;
  personId: string | null;
  eventId: string | null;
  startedAt: string;
  steps: Array<{ type: string; status: string }>;
};

export type BirthdayPreparationViewModel = {
  gift: "missing" | "ready";
  greeting: "missing" | "ready";
  plan: "none" | "active" | "waiting_user" | "paused" | "completed";
  canStartPreparation: boolean;
  urgency: "normal" | "critical";
};

const ACTIVE_PLAN_STATUSES = new Set(["active", "waiting_user", "paused"]);
const PLAN_STATUSES = new Set(["active", "waiting_user", "paused", "completed"]);

function birthday(event: EventPreparationEvent): boolean {
  return event.category?.trim().toLocaleLowerCase() === "birthday";
}

function matchingTasks(event: EventPreparationEvent, tasks: readonly EventPreparationTask[]): EventPreparationTask[] {
  if (!event.personId) return [];
  return tasks
    .filter((task) => task.type === "birthday_preparation" && task.eventId === event.id && task.personId === event.personId && PLAN_STATUSES.has(task.status))
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt) || right.id.localeCompare(left.id));
}

/**
 * Pure, durable-state-only presentation for a persisted birthday Event.
 * Completed plans deliberately suppress a new CTA: this engine has no
 * occurrence-restart policy beyond the existing Event identity.
 */
export function buildBirthdayPreparationViewModel(input: {
  event: EventPreparationEvent;
  gifts: readonly EventPreparationGift[];
  tasks: readonly EventPreparationTask[];
}): BirthdayPreparationViewModel | null {
  const { event, gifts } = input;
  if (!birthday(event)) return null;

  const tasks = matchingTasks(event, input.tasks);
  const current = tasks.find((task) => ACTIVE_PLAN_STATUSES.has(task.status)) ?? null;
  const completed = tasks.find((task) => task.status === "completed") ?? null;
  const task = current ?? completed;
  const giftReady = hasMatchingBirthdayGift(gifts, event.personId, event.id);
  const greetingReady = tasks.some((candidate) => candidate.steps.some((step) => step.type === "prepare_greeting" && step.status === "completed"));

  return {
    gift: giftReady ? "ready" : "missing",
    greeting: greetingReady ? "ready" : "missing",
    plan: task?.status === "active" || task?.status === "waiting_user" || task?.status === "paused" || task?.status === "completed" ? task.status : "none",
    canStartPreparation: Boolean(event.personId) && task === null,
    urgency: resolveBirthdayUrgency({ occurrence: event.date, daysUntil: event.daysUntil ?? null, giftReady }),
  };
}
