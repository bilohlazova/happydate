import type { PlannedReminder } from "../brain/engines/reminderPlanningEngine.ts";

export interface ReminderPresentation {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  priority: PlannedReminder["priority"];
  type: PlannedReminder["type"];
  reason: PlannedReminder["reason"];
  sourceMemoryIds: string[];
}

export type ReminderTranslate = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export interface PresentReminderInput {
  reminder: PlannedReminder;
  translate: ReminderTranslate;
}

const MESSAGE_KEYS = {
  event_today: {
    title: "reminders.today.title",
    description: "reminders.today.description",
    action: "reminders.actions.viewPerson",
    required: ["personName", "daysUntil"],
  },
  gift_saved: {
    title: "reminders.savedGift.title",
    description: "reminders.savedGift.description",
    action: "reminders.actions.viewPerson",
    required: ["personName", "daysUntil"],
  },
  gift_prepare: {
    title: "reminders.prepareGift.title",
    description: "reminders.prepareGift.description",
    action: "reminders.actions.prepare",
    required: ["personName", "daysUntil", "context1"],
  },
  missing_person_context: {
    title: "reminders.missingContext.title",
    description: "reminders.missingContext.description",
    action: "reminders.actions.addInformation",
    required: ["personName", "daysUntil"],
  },
  event_upcoming: {
    title: "reminders.upcoming.title",
    description: "reminders.upcoming.description",
    action: "reminders.actions.viewPerson",
    required: ["daysUntil"],
  },
} as const;

export const REMINDER_MESSAGE_KEYS = Object.freeze(
  [...new Set(Object.values(MESSAGE_KEYS).flatMap((item) => [item.title, item.description, item.action]))].sort(),
);

function meaningfulString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validParam(value: unknown): value is string | number {
  return meaningfulString(value) || (typeof value === "number" && Number.isFinite(value));
}

export function hasRequiredReminderParams(reminder: PlannedReminder): boolean {
  const contract = MESSAGE_KEYS[reminder.type];
  return contract.required.every((key) => validParam(reminder.params[key]));
}

export function hasSupportedReminderMessageKeys(reminder: PlannedReminder): boolean {
  const contract = MESSAGE_KEYS[reminder.type];
  return reminder.titleKey === contract.title
    && reminder.descriptionKey === contract.description
    && reminder.actionLabelKey === contract.action;
}

function translated(
  translate: ReminderTranslate,
  key: string,
  params: Record<string, string | number>,
  fallback?: string,
): string | null {
  try {
    const value = translate(key, params);
    if (meaningfulString(value) && value !== key) return value;
  } catch {
    // Translation failures are contained at this pure presentation boundary.
  }
  return meaningfulString(fallback) ? fallback : null;
}

export function presentReminder({
  reminder,
  translate,
}: PresentReminderInput): ReminderPresentation | null {
  if (!reminder || typeof translate !== "function") return null;
  if (!meaningfulString(reminder.id) || !meaningfulString(reminder.action?.url)) return null;
  if (!hasSupportedReminderMessageKeys(reminder) || !hasRequiredReminderParams(reminder)) return null;

  const params: Record<string, string | number> = {
    ...reminder.params,
    contextCount: validParam(reminder.params.context2) ? "other" : "one",
    context2: validParam(reminder.params.context2) ? reminder.params.context2 : "",
  };
  const title = translated(translate, reminder.titleKey, params, reminder.fallbackTitle);
  const description = translated(
    translate,
    reminder.descriptionKey,
    params,
    reminder.fallbackDescription,
  );
  const actionLabel = translated(translate, reminder.actionLabelKey, params);
  if (!title || !description || !actionLabel) return null;

  return {
    id: reminder.id,
    title,
    description,
    actionLabel,
    actionUrl: reminder.action.url,
    priority: reminder.priority,
    type: reminder.type,
    reason: reminder.reason,
    sourceMemoryIds: [...reminder.sourceMemoryIds],
  };
}
