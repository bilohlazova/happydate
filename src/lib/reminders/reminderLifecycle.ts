export const REMINDER_STATES = ["pending", "snoozed", "completed", "cancelled"] as const;
export type ReminderState = (typeof REMINDER_STATES)[number];

export interface ReminderLifecycle {
  state: ReminderState;
  nextRemindAt: string | null;
  snoozedUntil: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}

export class ReminderTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReminderTransitionError";
  }
}

function validInstant(value: string | Date): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new ReminderTransitionError("Reminder transition requires a valid timestamp");
  }
  return date;
}

function iso(value: string | Date): string {
  return validInstant(value).toISOString();
}

export function completeReminder(
  reminder: ReminderLifecycle,
  completedAt: string | Date,
): ReminderLifecycle {
  if (reminder.state === "cancelled") {
    throw new ReminderTransitionError("A cancelled reminder cannot be completed");
  }
  if (reminder.state === "completed") return { ...reminder };
  return {
    state: "completed",
    nextRemindAt: null,
    snoozedUntil: null,
    completedAt: iso(completedAt),
    cancelledAt: null,
  };
}

export function snoozeReminder(
  reminder: ReminderLifecycle,
  snoozedUntil: string | Date,
  now: string | Date,
): ReminderLifecycle {
  if (reminder.state === "completed" || reminder.state === "cancelled") {
    throw new ReminderTransitionError(`A ${reminder.state} reminder cannot be snoozed`);
  }
  const until = validInstant(snoozedUntil);
  if (until.getTime() <= validInstant(now).getTime()) {
    throw new ReminderTransitionError("Snooze time must be in the future");
  }
  const timestamp = until.toISOString();
  return {
    state: "snoozed",
    nextRemindAt: timestamp,
    snoozedUntil: timestamp,
    completedAt: null,
    cancelledAt: null,
  };
}

export function reopenReminder(
  reminder: ReminderLifecycle,
  nextRemindAt: string | Date,
): ReminderLifecycle {
  if (reminder.state !== "completed") {
    throw new ReminderTransitionError("Only a completed reminder can be reopened");
  }
  return {
    state: "pending",
    nextRemindAt: iso(nextRemindAt),
    snoozedUntil: null,
    completedAt: null,
    cancelledAt: null,
  };
}

export function cancelReminder(
  reminder: ReminderLifecycle,
  cancelledAt: string | Date,
): ReminderLifecycle {
  if (reminder.state === "completed") {
    throw new ReminderTransitionError("A completed reminder cannot be cancelled");
  }
  if (reminder.state === "cancelled") return { ...reminder };
  return {
    state: "cancelled",
    nextRemindAt: null,
    snoozedUntil: null,
    completedAt: null,
    cancelledAt: iso(cancelledAt),
  };
}

