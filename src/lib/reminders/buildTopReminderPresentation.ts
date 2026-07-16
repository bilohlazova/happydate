import {
  planReminders,
  selectTopReminder,
} from "../brain/engines/reminderPlanningEngine.ts";
import type {
  PlannedReminder,
} from "../brain/engines/reminderPlanningEngine.ts";
import type {
  BrainEvent,
  BrainMemory,
  BrainPerson,
  PersonKnowledge,
} from "../brain/types.ts";
import {
  presentReminder,
} from "./presentReminder.ts";
import type {
  ReminderPresentation,
  ReminderTranslate,
} from "./presentReminder.ts";

export interface BuildTopReminderPresentationInput {
  people: BrainPerson[];
  events: BrainEvent[];
  memories: BrainMemory[];
  personKnowledge?: PersonKnowledge[];
  currentDate: Date;
  translate: ReminderTranslate;
}

export interface ReminderPresentationResult {
  plannedReminder: PlannedReminder;
  presentation: ReminderPresentation;
}

export type TopReminderPresentationResult = ReminderPresentationResult | null;

function isValidInput(
  input: BuildTopReminderPresentationInput,
): input is BuildTopReminderPresentationInput {
  return Boolean(input)
    && Array.isArray(input.people)
    && Array.isArray(input.events)
    && Array.isArray(input.memories)
    && (input.personKnowledge === undefined || Array.isArray(input.personKnowledge))
    && input.currentDate instanceof Date
    && Number.isFinite(input.currentDate.getTime())
    && typeof input.translate === "function";
}

function planAndPresent(
  input: BuildTopReminderPresentationInput,
): ReminderPresentationResult[] {
  if (!isValidInput(input) || input.events.length === 0) return [];

  // Future callers must provide only current-user-owned canonical data. Privacy
  // filtering stays in the planner, PersonKnowledge, and presentation adapter;
  // this pure boundary deliberately performs no authentication or DB access.
  const reminders = planReminders({
    people: input.people,
    events: input.events,
    memories: input.memories,
    personKnowledge: input.personKnowledge,
    currentDate: input.currentDate,
  });

  const results: ReminderPresentationResult[] = [];
  for (const plannedReminder of reminders) {
    const presentation = presentReminder({
      reminder: plannedReminder,
      translate: input.translate,
    });
    if (presentation) results.push({ plannedReminder, presentation });
  }
  return results;
}

export function buildReminderPresentations(
  input: BuildTopReminderPresentationInput,
): ReminderPresentationResult[] {
  return planAndPresent(input);
}

export function buildTopReminderPresentation(
  input: BuildTopReminderPresentationInput,
): TopReminderPresentationResult {
  if (!isValidInput(input) || input.events.length === 0) return null;

  const planned = planReminders({
    people: input.people,
    events: input.events,
    memories: input.memories,
    personKnowledge: input.personKnowledge,
    currentDate: input.currentDate,
  });
  const plannedReminder = selectTopReminder(planned);
  if (!plannedReminder) return null;

  const presentation = presentReminder({
    reminder: plannedReminder,
    translate: input.translate,
  });
  return presentation ? { plannedReminder, presentation } : null;
}
