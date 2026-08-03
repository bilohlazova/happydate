import type { ReminderLifecycle, ReminderState } from "@/lib/reminders/reminderLifecycle";

export type ReminderActionKind = "congratulate" | "prepare" | "follow_up";

export interface ReminderRecord extends ReminderLifecycle {
  id: string;
  userId: string;
  eventId: string;
  occurrenceDate: string;
  actionKind: ReminderActionKind;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderInput {
  eventId: string;
  occurrenceDate: string;
  actionKind?: ReminderActionKind;
  nextRemindAt: string | null;
}

export interface ReminderRow {
  id: string;
  user_id: string;
  event_id: string;
  occurrence_date: string;
  action_kind: ReminderActionKind;
  state: ReminderState;
  next_remind_at: string | null;
  snoozed_until: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

