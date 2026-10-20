import type { BirthdayUrgency } from "../../birthday/birthdayPresentation.ts";
import type { OccasionOccurrence, OccasionPhase } from "../../occasions/occasion.types.ts";
import type { OccasionPeopleResolution } from "../../occasions/occasionPeople.types.ts";
import { happyToolRequiresApproval } from "../tools/happyTools.ts";
import { isSignalAllowedByMode, type ProactiveSignal } from "../proactive/proactivityPolicy.ts";
import { buildHappyTaskCardModel, type HappyTaskCardSource } from "../task-ui/happyTaskCard.ts";
import type { HomeHappyAction, HomeHappyIdea } from "../../home/home.types.ts";
import type { ProactivityMode } from "../../../../supabase/functions/happy-proactive/proactivity-policy.ts";
import type { BirthdaySignal, HappySignal, IdeaSignal, OccasionSignal, PendingApprovalSignal, RescueSignal, TaskSignal } from "./happySignal.types.ts";
import type { OccasionReadiness } from "../../occasions/occasionPreparation.ts";

const PROACTIVE_TYPES = new Set<ProactiveSignal>(["start_gift_planning", "gift_help", "gift_missing", "prepare_greeting"]);
const OCCASION_PHASES = new Set<OccasionPhase>(["planning", "preparing", "urgent", "today"]);

function uuidLike(value: string): boolean {
  return value.trim().length > 0;
}

export function toPendingApprovalSignal(action: HomeHappyAction): PendingApprovalSignal | null {
  if (!uuidLike(action.id) || action.status !== "pending" || !happyToolRequiresApproval(action.type)) return null;
  return { kind: "pending_approval", signalKey: `happy-signal:approval:${action.id}`, actionId: action.id, actionType: action.type, createdAt: action.createdAt };
}

export function toTaskSignal(source: HappyTaskCardSource, now: Date): TaskSignal | null {
  const model = buildHappyTaskCardModel(source, now);
  if (!model) return null;
  return { kind: "task", signalKey: `happy-signal:task:${model.id}`, taskId: model.id, status: model.status, daysUntil: model.event.daysUntil };
}

function ideaDaysUntil(idea: HomeHappyIdea, events: readonly { id: string; date: string }[], now: Date): number | null {
  if (!idea.eventId) return null;
  const event = events.find((candidate) => candidate.id === idea.eventId);
  if (!event || !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) return null;
  const [year, month, day] = event.date.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);
  // Keep the Block-33 date-only contract: Home's existing daysUntil helper
  // anchors the current day to the UTC calendar representation, not the
  // machine's local timezone.
  const [currentYear, currentMonth, currentDay] = now.toISOString().slice(0, 10).split("-").map(Number);
  const current = Date.UTC(currentYear, currentMonth - 1, currentDay);
  return Math.round((target - current) / 86_400_000);
}

export function toIdeaSignal(input: {
  idea: HomeHappyIdea;
  events: readonly { id: string; date: string }[];
  now: Date;
  proactivityMode?: ProactivityMode;
}): IdeaSignal | null {
  const { idea } = input;
  if (!uuidLike(idea.id) || !["new", "shown"].includes(idea.status)) return null;
  if (PROACTIVE_TYPES.has(idea.type as ProactiveSignal) && !isSignalAllowedByMode(input.proactivityMode ?? "active", idea.type as ProactiveSignal)) return null;
  return { kind: "idea", signalKey: `happy-signal:idea:${idea.id}`, ideaId: idea.id, ideaType: idea.type, daysUntil: ideaDaysUntil(idea, input.events, input.now), createdAt: idea.createdAt };
}

export function toBirthdaySignal(input: {
  occurrenceKey: string;
  eventId?: string | null;
  personId?: string | null;
  daysUntil: number;
  urgency: BirthdayUrgency;
  giftReady: boolean;
}): BirthdaySignal | null {
  if (!uuidLike(input.occurrenceKey) || !Number.isInteger(input.daysUntil) || input.daysUntil < 0) return null;
  return {
    kind: "birthday",
    signalKey: `happy-signal:birthday:${input.occurrenceKey}`,
    occurrenceKey: input.occurrenceKey,
    eventId: input.eventId ?? null,
    personId: input.personId ?? null,
    daysUntil: input.daysUntil,
    urgency: input.urgency,
    giftReady: input.giftReady,
  };
}

export function toOccasionSignal(input: {
  occurrence: OccasionOccurrence;
  people: OccasionPeopleResolution;
  readiness?: OccasionReadiness;
}): OccasionSignal | null {
  const { occurrence, people } = input;
  if (!OCCASION_PHASES.has(occurrence.phase as OccasionPhase) || people.occasionKey !== occurrence.occasionKey || people.occurrenceKey !== occurrence.occurrenceKey) return null;
  const resolved = people.kind === "resolved";
  if (people.kind === "none") return null;
  return {
    kind: "occasion",
    signalKey: `happy-signal:occasion:${occurrence.occurrenceKey}`,
    occasionKey: occurrence.occasionKey,
    occurrenceKey: occurrence.occurrenceKey,
    phase: occurrence.phase as OccasionPhase,
    recipientResolution: resolved ? "resolved" : "selection_required",
    personId: resolved ? people.personId : null,
    candidates: people.kind === "selection_required" ? people.candidates : [],
    daysUntil: occurrence.daysUntil,
    ...(input.readiness ? { readiness: input.readiness } : {}),
  };
}

export function toRescueSignal(input: { rescueKey: string; occasionKey: string; occurrenceKey: string; personId: string; phase: "urgent" | "today"; missing: readonly ("gift" | "greeting" | "preparation")[]; daysUntil: number }): RescueSignal | null {
  if (!uuidLike(input.rescueKey) || !uuidLike(input.occasionKey) || !uuidLike(input.occurrenceKey) || !uuidLike(input.personId) || !["urgent", "today"].includes(input.phase) || input.missing.length === 0 || !Number.isInteger(input.daysUntil) || input.daysUntil < 0) return null;
  return { kind: "rescue", signalKey: `happy-signal:rescue:${input.rescueKey}`, rescueKey: input.rescueKey, occasionKey: input.occasionKey, occurrenceKey: input.occurrenceKey, personId: input.personId, phase: input.phase, missing: input.missing, daysUntil: input.daysUntil, requiresAction: true };
}

export function buildExistingHomeSignals(input: {
  actions: readonly HomeHappyAction[];
  tasks: readonly HappyTaskCardSource[];
  ideas: readonly HomeHappyIdea[];
  events: readonly { id: string; date: string }[];
  occasions?: readonly OccasionSignal[];
  rescues?: readonly RescueSignal[];
  now: Date;
  proactivityMode?: ProactivityMode;
}): HappySignal[] {
  return [
    ...input.actions.map(toPendingApprovalSignal),
    ...input.tasks.map((task) => toTaskSignal(task, input.now)),
    ...input.ideas.map((idea) => toIdeaSignal({ idea, events: input.events, now: input.now, proactivityMode: input.proactivityMode })),
    ...(input.occasions ?? []),
    ...(input.rescues ?? []),
  ].filter((signal): signal is NonNullable<typeof signal> => signal !== null);
}
