import { supabase } from "@/lib/supabaseClient";
import {
  cancelReminder,
  completeReminder,
  reopenReminder,
  snoozeReminder,
  type ReminderLifecycle,
} from "@/lib/reminders/reminderLifecycle";
import type {
  CreateReminderInput,
  ReminderRecord,
  ReminderRow,
} from "./reminders.types";

const REMINDER_COLUMNS = [
  "id",
  "user_id",
  "event_id",
  "occurrence_date",
  "action_kind",
  "state",
  "next_remind_at",
  "snoozed_until",
  "completed_at",
  "cancelled_at",
  "created_at",
  "updated_at",
].join(", ");

function parseReminderRow(value: unknown): ReminderRow {
  if (!value || typeof value !== "object") {
    throw new Error("[reminders.repository] Invalid reminder response");
  }
  const row = value as Record<string, unknown>;
  const state = row.state;
  const actionKind = row.action_kind;
  if (
    typeof row.id !== "string"
    || typeof row.user_id !== "string"
    || typeof row.event_id !== "string"
    || typeof row.occurrence_date !== "string"
    || !["congratulate", "prepare", "follow_up"].includes(String(actionKind))
    || !["pending", "snoozed", "completed", "cancelled"].includes(String(state))
    || typeof row.created_at !== "string"
    || typeof row.updated_at !== "string"
  ) {
    throw new Error("[reminders.repository] Invalid reminder response");
  }
  return row as unknown as ReminderRow;
}

function mapReminder(row: ReminderRow): ReminderRecord {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    occurrenceDate: row.occurrence_date,
    actionKind: row.action_kind,
    state: row.state,
    nextRemindAt: row.next_remind_at,
    snoozedUntil: row.snoozed_until,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function lifecycle(record: ReminderRecord): ReminderLifecycle {
  return {
    state: record.state,
    nextRemindAt: record.nextRemindAt,
    snoozedUntil: record.snoozedUntil,
    completedAt: record.completedAt,
    cancelledAt: record.cancelledAt,
  };
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(`[reminders.repository] Authentication failed: ${error.message}`);
  if (!data.user) throw new Error("[reminders.repository] Authentication required");
  return data.user.id;
}

async function getOwnedReminder(id: string, userId: string): Promise<ReminderRecord> {
  const { data, error } = await supabase
    .from("reminders")
    .select(REMINDER_COLUMNS)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`[reminders.repository] Load failed: ${error.message}`);
  if (!data) throw new Error("[reminders.repository] Reminder not found");
  return mapReminder(parseReminderRow(data));
}

export async function listActiveReminders(): Promise<ReminderRecord[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("reminders")
    .select(REMINDER_COLUMNS)
    .eq("user_id", userId)
    .in("state", ["pending", "snoozed"])
    .order("next_remind_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`[reminders.repository] List failed: ${error.message}`);
  return (data ?? []).map((row) => mapReminder(parseReminderRow(row)));
}

export async function ensureReminderForOccurrence(
  input: CreateReminderInput,
): Promise<ReminderRecord> {
  const userId = await requireUserId();
  const actionKind = input.actionKind ?? "congratulate";
  const { data, error } = await supabase
    .from("reminders")
    .upsert({
      user_id: userId,
      event_id: input.eventId,
      occurrence_date: input.occurrenceDate,
      action_kind: actionKind,
      state: "pending",
      next_remind_at: input.nextRemindAt,
      snoozed_until: null,
      completed_at: null,
      cancelled_at: null,
    }, {
      onConflict: "user_id,event_id,occurrence_date,action_kind",
      ignoreDuplicates: true,
    })
    .select(REMINDER_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(`[reminders.repository] Create failed: ${error.message}`);
  if (data) return mapReminder(parseReminderRow(data));

  const { data: existing, error: existingError } = await supabase
    .from("reminders")
    .select(REMINDER_COLUMNS)
    .eq("user_id", userId)
    .eq("event_id", input.eventId)
    .eq("occurrence_date", input.occurrenceDate)
    .eq("action_kind", actionKind)
    .single();
  if (existingError) throw new Error(`[reminders.repository] Reload failed: ${existingError.message}`);
  return mapReminder(parseReminderRow(existing));
}

export async function activateReminderForOccurrence(
  input: CreateReminderInput,
): Promise<ReminderRecord> {
  const userId = await requireUserId();
  const actionKind = input.actionKind ?? "congratulate";
  const { data, error } = await supabase
    .from("reminders")
    .upsert({
      user_id: userId,
      event_id: input.eventId,
      occurrence_date: input.occurrenceDate,
      action_kind: actionKind,
      state: "pending",
      next_remind_at: input.nextRemindAt,
      snoozed_until: null,
      completed_at: null,
      cancelled_at: null,
    }, { onConflict: "user_id,event_id,occurrence_date,action_kind" })
    .select(REMINDER_COLUMNS)
    .single();
  if (error) throw new Error(`[reminders.repository] Activation failed: ${error.message}`);
  return mapReminder(parseReminderRow(data));
}

export async function cancelActiveRemindersForEvent(
  eventId: string,
  at = new Date(),
): Promise<void> {
  const userId = await requireUserId();
  const timestamp = at.toISOString();
  const { error } = await supabase
    .from("reminders")
    .update({
      state: "cancelled",
      next_remind_at: null,
      snoozed_until: null,
      cancelled_at: timestamp,
      updated_at: timestamp,
    })
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .in("state", ["pending", "snoozed"]);
  if (error) throw new Error(`[reminders.repository] Event cancellation failed: ${error.message}`);
}

async function persistTransition(
  id: string,
  transition: (current: ReminderLifecycle) => ReminderLifecycle,
): Promise<ReminderRecord> {
  const userId = await requireUserId();
  const current = await getOwnedReminder(id, userId);
  const next = transition(lifecycle(current));
  const { data, error } = await supabase
    .from("reminders")
    .update({
      state: next.state,
      next_remind_at: next.nextRemindAt,
      snoozed_until: next.snoozedUntil,
      completed_at: next.completedAt,
      cancelled_at: next.cancelledAt,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("state", current.state)
    .select(REMINDER_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(`[reminders.repository] Transition failed: ${error.message}`);
  if (!data) throw new Error("[reminders.repository] Reminder changed; reload and try again");
  return mapReminder(parseReminderRow(data));
}

export function markReminderCompleted(id: string, at = new Date()): Promise<ReminderRecord> {
  return persistTransition(id, (current) => completeReminder(current, at));
}

export function postponeReminder(
  id: string,
  until: string | Date,
  now = new Date(),
): Promise<ReminderRecord> {
  return persistTransition(id, (current) => snoozeReminder(current, until, now));
}

export function undoReminderCompletion(
  id: string,
  nextRemindAt = new Date(),
): Promise<ReminderRecord> {
  return persistTransition(id, (current) => reopenReminder(current, nextRemindAt));
}

export function cancelOwnedReminder(id: string, at = new Date()): Promise<ReminderRecord> {
  return persistTransition(id, (current) => cancelReminder(current, at));
}
