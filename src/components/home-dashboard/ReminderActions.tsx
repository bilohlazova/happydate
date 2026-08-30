"use client";

import { Check, Clock3, Gift, RotateCcw } from "lucide-react";
import type { ReminderRecord } from "@/lib/repositories/reminders";

interface ReminderActionsProps {
  reminder: ReminderRecord;
  eventIsToday: boolean;
  canPickGift: boolean;
  busy: boolean;
  error: string | null;
  labels: {
    completed: string;
    complete: string;
    snooze: string;
    snoozed: string;
    undo: string;
    pickGift: string;
    error: string;
  };
  onComplete: () => void;
  onSnooze: () => void;
  onUndo: () => void;
  onPickGift: () => void;
}

export default function ReminderActions({
  reminder,
  eventIsToday,
  canPickGift,
  busy,
  error,
  labels,
  onComplete,
  onSnooze,
  onUndo,
  onPickGift,
}: ReminderActionsProps) {
  if (reminder.state === "cancelled") return null;
  const completed = reminder.state === "completed";

  return (
    <div className="mt-4 border-t border-slate-100 pt-4" aria-live="polite">
      {completed ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-emerald-50 px-3.5 py-3 text-emerald-800">
          <span className="flex items-center gap-2 text-sm font-extrabold">
            <Check size={17} aria-hidden="true" />{labels.completed}
          </span>
          <button type="button" disabled={busy} onClick={onUndo} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold transition hover:bg-emerald-100 disabled:opacity-50">
            <RotateCcw size={14} aria-hidden="true" />{labels.undo}
          </button>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          {eventIsToday && (
            <button type="button" disabled={busy} onClick={onComplete} className="hd-button min-h-11 bg-emerald-600 px-3 text-white hover:bg-emerald-700 disabled:opacity-50">
              <Check size={16} aria-hidden="true" />{labels.complete}
            </button>
          )}
          <button type="button" disabled={busy} onClick={onSnooze} className="hd-button min-h-11 border border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <Clock3 size={16} aria-hidden="true" />{reminder.state === "snoozed" ? labels.snoozed : labels.snooze}
          </button>
          {canPickGift && (
            <button type="button" disabled={busy} onClick={onPickGift} className="hd-button min-h-11 border border-amber-200 bg-amber-50 px-3 text-amber-800 hover:bg-amber-100 disabled:opacity-50">
              <Gift size={16} aria-hidden="true" />{labels.pickGift}
            </button>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-rose-600" role="alert">{labels.error}</p>}
    </div>
  );
}
