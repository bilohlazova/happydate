"use client";

import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { CalendarEventRecord as EventRow } from "@/lib/repositories/events";
import type { EventRecurrenceRule } from "@/lib/repositories/events";
import { expandCalendarEventOccurrences } from "@/lib/events/eventRecurrence";
import { addLocalDateOnlyDays, formatLocalDateOnly, parseLocalDateOnly } from "@/lib/events/dateOnly";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  importCalendarEvents,
  listCalendarEvents,
  updateCalendarEvent,
} from "@/lib/repositories/events";
import { reconcileCalendarEventReminder } from "@/lib/reminders/calendarEventReminder";
import { buildDayPlanDraft, findDayPlanConflicts, isValidDayPlanItemWithinWindow, isValidEventDuration, isValidTravelBuffer, reflowDayPlanDraft, reorderDayPlanDraft, resizeDayPlanDraft, selectDayPlanCandidates, summarizeDayPlanDraft, type DayPlanDraftItem, type DayPlanFixedEvent, type DayPlanMoveDirection } from "@/lib/events/dayPlanDraft";
import { DEFAULT_PLANNER_PREFERENCES, loadPlannerPreferences, savePlannerPreferences, type PlannerPreferences } from "@/lib/repositories/plannerPreferences.repository";

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */

type PersonRow = {
  id: string;
  name: string;
  birthday: string | null;
  notes?: string | null;
};

type RealtimeEventRow = Omit<EventRow, "personId" | "personName" | "isImportant" | "recurrenceRule"> & {
  person_id?: string | null;
  person_name?: string | null;
  is_important?: boolean | null;
  recurrence_rule?: EventRecurrenceRule | null;
  time_of_day?: string | null;
  duration_minutes?: number | null;
  location?: string | null;
  travel_buffer_minutes?: number | null;
};

function mapRealtimeEvent(row: RealtimeEventRow): EventRow {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    timeOfDay: typeof row.time_of_day === "string" ? row.time_of_day.slice(0, 5) : row.timeOfDay ?? null,
    durationMinutes: Number.isInteger(row.duration_minutes) ? row.duration_minutes ?? null : row.durationMinutes ?? null,
    location: row.location ?? null,
    travelBufferMinutes: Number.isInteger(row.travel_buffer_minutes) ? row.travel_buffer_minutes ?? null : row.travelBufferMinutes ?? null,
    notes: row.notes ?? null,
    category: row.category ?? null,
    personId: row.person_id ?? null,
    personName: row.person_name ?? null,
    isImportant: row.is_important === true,
    recurrenceRule: row.recurrence_rule ?? "none",
  };
}

/* ═══════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════ */

const CAT_COLOR: Record<string, { dot: string; pill: string; text: string }> = {
  birthday: {
    dot: "bg-pink-400",
    pill: "bg-pink-50 border-pink-200",
    text: "text-pink-700",
  },
  work: {
    dot: "bg-blue-400",
    pill: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
  },
  personal: {
    dot: "bg-emerald-400",
    pill: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
  },
  default: {
    dot: "bg-slate-400",
    pill: "bg-slate-50 border-slate-200",
    text: "text-slate-600",
  },
};

const CAT_EMOJI: Record<string, string> = {
  birthday: "🎂",
  work: "💼",
  personal: "⭐",
  default: "📌",
};

type InsightTopic =
  | "coffee"
  | "travel"
  | "reading"
  | "watches"
  | "photography"
  | "music"
  | "sport"
  | "relax"
  | "gaming"
  | "cooking";
type CountdownKey =
  | "countdown.today"
  | "countdown.tomorrow"
  | "countdown.past"
  | "countdown.future";

const AI_TOPICS: Array<[RegExp, InsightTopic]> = [
  [/kawa|coffee/i, "coffee"],
  [/podróż|travel|wyjazd/i, "travel"],
  [/książk|czyta/i, "reading"],
  [/zegar|watch/i, "watches"],
  [/foto|aparat|fuji/i, "photography"],
  [/muzyk|gitara|piano/i, "music"],
  [/sport|siłown|bieg/i, "sport"],
  [/wellness|spa|relaks/i, "relax"],
  [/gier|gaming|game/i, "gaming"],
  [/gotow|kulinarn/i, "cooking"],
];

/* ═══════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════ */

function ymd(d: Date): string {
  return formatLocalDateOnly(d);
}

function todayYMD(): string {
  return ymd(new Date());
}

function daysLeft(dateYMD: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dt = parseLocalDateOnly(dateYMD);
  if (!dt) return Number.NaN;
  return Math.round((dt.getTime() - today.getTime()) / 86400000);
}

function daysLabel(
  dateYMD: string,
  t: (key: CountdownKey, values?: { days: number }) => string
): string {
  const d = daysLeft(dateYMD);
  if (d === 0) return t("countdown.today");
  if (d === 1) return t("countdown.tomorrow");
  if (d < 0) return t("countdown.past", { days: Math.abs(d) });
  return t("countdown.future", { days: d });
}

function urgencyBadge(dateYMD: string): string {
  const d = daysLeft(dateYMD);
  if (d <= 0) return "bg-rose-50 text-rose-600 border-rose-200";
  if (d <= 3) return "bg-orange-50 text-orange-600 border-orange-200";
  if (d <= 7) return "bg-amber-50 text-amber-700 border-amber-200";
  if (d <= 14) return "bg-sky-50 text-sky-600 border-sky-200";
  return "bg-slate-50 text-slate-500 border-slate-200";
}

function formatDateShort(dateYMD: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(parseLocalDateOnly(dateYMD) ?? new Date(Number.NaN));
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_PALETTE = [
  "bg-pink-100 text-pink-700",
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];

function avatarClass(name: string): string {
  return AVATAR_PALETTE[(name.charCodeAt(0) ?? 0) % AVATAR_PALETTE.length];
}

function getAIInsight(person: PersonRow): InsightTopic | null {
  if (!person.notes) return null;
  for (const [re, label] of AI_TOPICS) {
    if (re.test(person.notes)) return label;
  }
  return null;
}

/* ICS */
function toUTCStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(
    d.getUTCDate()
  )}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}
function addOneDayICS(dt: string): string {
  const d = new Date(
    Date.UTC(+dt.slice(0, 4), +dt.slice(4, 6) - 1, +dt.slice(6, 8))
  );
  d.setUTCDate(d.getUTCDate() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`;
}
function escICS(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/* ═══════════════════════════════════════════════════
   BODY SCROLL LOCK
   Prevents background scroll while a modal is open.
   Uses a counter so nested modals work correctly.
═══════════════════════════════════════════════════ */
let scrollLockCount = 0;

function lockBodyScroll() {
  scrollLockCount++;
  if (scrollLockCount === 1) {
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
  }
}

function unlockBodyScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    const scrollY = document.body.style.top;
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    // Restore scroll position after un-fixing
    window.scrollTo(0, -parseInt(scrollY || "0", 10));
  }
}

function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [active]);
}

/* ═══════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════ */
type Toast = { id: number; type: "success" | "error"; msg: string };

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, ...t }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 3200);
  }, []);
  return { toasts, push };
}

function ToastStack({ items }: { items: Toast[] }) {
  if (!items.length) return null;
  return (
    <div className="fixed top-safe-top top-4 right-4 z-[500] flex flex-col gap-2 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium shadow-lg border pointer-events-auto backdrop-blur-xl ${
            t.type === "success"
              ? "bg-white/90 border-emerald-200 text-emerald-800"
              : "bg-white/90 border-red-200 text-red-700"
          }`}
          style={{
            animation: "toastIn .25s cubic-bezier(.34,1.56,.64,1) both",
          }}
        >
          <span>{t.type === "success" ? "✅" : "❌"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   FOCUS TRAP
═══════════════════════════════════════════════════ */
function useFocusTrap(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    const sel = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
        )
      ).filter((n) => !n.hasAttribute("disabled"));
    sel()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = sel();
      const idx = nodes.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey ? idx <= 0 : idx === nodes.length - 1) {
        e.preventDefault();
        nodes[e.shiftKey ? nodes.length - 1 : 0].focus();
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [active]);
  return ref;
}

/* ═══════════════════════════════════════════════════
   CONFIRM DIALOG
═══════════════════════════════════════════════════ */
type ConfirmState =
  | { open: false }
  | {
      open: true;
      type: "delete" | "update";
      title: string;
      description?: string;
      confirmText?: string;
      onConfirm: () => Promise<void> | void;
    };

function ConfirmDialog({
  state,
  onClose,
}: {
  state: ConfirmState;
  onClose: () => void;
}) {
  const t = useTranslations("dashboard");
  const [busy, setBusy] = useState(false);
  const ref = useFocusTrap(state.open);
  useBodyScrollLock(state.open);
  if (!state.open) return null;
  const {
    title,
    description,
    confirmText = t("common.confirm"),
    onConfirm,
    type,
  } = state;
  const danger = type === "delete";

  const handleOk = async () => {
    try {
      setBusy(true);
      await onConfirm();
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        ref={ref}
        className="relative bg-white/96 backdrop-blur-2xl w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-white/50"
        style={{ animation: "sheetUp .28s cubic-bezier(.34,1.56,.64,1) both" }}
      >
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${
            danger ? "bg-red-100" : "bg-emerald-100"
          }`}
        >
          <span className="text-xl">{danger ? "🗑️" : "💾"}</span>
        </div>
        <p className="font-bold text-slate-900 text-base mb-1">{title}</p>
        {description && (
          <p className="text-sm text-slate-500 mb-4 leading-relaxed">
            {description}
          </p>
        )}
        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 h-11 rounded-2xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleOk}
            disabled={busy}
            className={`flex-1 h-11 rounded-2xl text-sm font-bold transition-all active:scale-[.98] ${
              danger
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-emerald-500 hover:bg-emerald-600 text-white"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ADD / EDIT SHEET
   iOS fixes applied:
   • Body scroll locked while open
   • max-h-[92dvh] + overflow-y-auto + overscroll-contain
   • pb-[env(safe-area-inset-bottom)] for home indicator
   • font-size ≥ 16px on all inputs (prevents Safari auto-zoom)
   • items-end → bottom sheet on mobile, sm:items-center → centered on desktop
═══════════════════════════════════════════════════ */
const CATEGORIES_ADD = [
  { value: "birthday", emoji: "🎂" },
  { value: "work", emoji: "💼" },
  { value: "personal", emoji: "⭐" },
] as const;

function AddEditSheet({
  mode,
  date,
  timeOfDay,
  durationMinutes,
  location,
  travelBufferMinutes,
  title,
  notes,
  category,
  personId,
  isImportant,
  recurrenceRule,
  people,
  setDate,
  setTimeOfDay,
  setDurationMinutes,
  setLocation,
  setTravelBufferMinutes,
  setTitle,
  setNotes,
  setCategory,
  setPersonId,
  setIsImportant,
  setRecurrenceRule,
  onCancel,
  onSubmit,
  onDelete,
}: {
  mode: "add" | "edit";
  date: string;
  timeOfDay: string;
  durationMinutes: string;
  location: string;
  travelBufferMinutes: string;
  title: string;
  notes: string;
  category: string;
  personId: string;
  isImportant: boolean;
  recurrenceRule: EventRecurrenceRule;
  people: PersonRow[];
  setDate: (v: string) => void;
  setTimeOfDay: (v: string) => void;
  setDurationMinutes: (v: string) => void;
  setLocation: (v: string) => void;
  setTravelBufferMinutes: (v: string) => void;
  setTitle: (v: string) => void;
  setNotes: (v: string) => void;
  setCategory: (v: string) => void;
  setPersonId: (v: string) => void;
  setIsImportant: (v: boolean) => void;
  setRecurrenceRule: (v: EventRecurrenceRule) => void;
  onCancel: () => void;
  onSubmit: () => void;
  onDelete?: () => void;
}) {
  const t = useTranslations("dashboard");
  const ref = useFocusTrap(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lock background scroll while sheet is open
  useBodyScrollLock(true);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${mode}-event-sheet-title`}
      // FIX 3: items-end = bottom sheet on mobile, sm:items-center = centered modal on desktop
      className="calendar-event-dialog fixed inset-0 z-[350] flex items-end sm:items-center justify-center"
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
        if (
          e.key === "Enter" &&
          (e.target as HTMLElement).tagName !== "TEXTAREA"
        ) {
          e.preventDefault();
          onSubmit();
        }
      }}
    >
      {/* Backdrop */}
      <div
        className="calendar-event-backdrop absolute inset-0 bg-black/35 backdrop-blur-[3px]"
        onClick={onCancel}
      />

      {/*
        FIX 2: Sheet panel
        • max-h-[92dvh]          — never taller than 92% of dynamic viewport height
        • overflow-y-auto        — sheet itself scrolls, not the page behind it
        • overscroll-contain     — stops scroll chaining to body (no bounce-through)
        • pb-[env(safe-area-inset-bottom)] — clears iPhone home indicator
        • sm:rounded-[2rem]      — full rounded on desktop (not just top)
        • sm:mb-0                — no bottom gap on desktop
      */}
      <div
        ref={ref}
        className="calendar-event-sheet
          relative
          bg-white
          w-full max-w-lg
          rounded-t-[2rem] sm:rounded-[2rem]
          shadow-2xl
          border-t sm:border border-white/40
          max-h-[92dvh]
          overflow-y-auto
          overscroll-contain
          pb-[env(safe-area-inset-bottom)]
        "
        style={{ animation: "sheetUp .3s cubic-bezier(.34,1.56,.64,1) both" }}
      >
        {/* Drag handle — visual affordance */}
        <div className="calendar-event-handle flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-9 h-[3px] rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="calendar-event-header flex items-center justify-between px-5 pt-2 pb-4 border-b border-slate-100">
          <button
            onClick={onCancel}
            className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors px-1 min-h-[44px] flex items-center"
          >
            {t("common.cancel")}
          </button>
          <h2 id={`${mode}-event-sheet-title`} className="calendar-event-title text-sm font-bold text-slate-800">
            {mode === "add" ? t("form.new") : t("form.edit")}
          </h2>
          <button
            onClick={onSubmit}
            disabled={!title || !date}
            className="text-sm font-bold text-sky-500 hover:text-sky-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-1 min-h-[44px] flex items-center"
          >
            {mode === "add" ? t("common.add") : t("common.save")}
          </button>
        </div>

        {/* Fields */}
        <div className="calendar-event-fields px-5 py-4 space-y-3">
          {/* Title — FIX 5: text-[16px] prevents Safari auto-zoom */}
          <div className="calendar-event-field calendar-event-field--title flex items-center gap-3 py-2 border-b border-slate-100">
            <span className="text-slate-300 text-lg select-none">✏️</span>
            <label htmlFor={`${mode}-event-title`} className="sr-only">{t("form.title")}</label>
            <input
              id={`${mode}-event-title`}
              ref={inputRef}
              type="text"
              placeholder={t("form.titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 placeholder-slate-300 outline-none bg-transparent font-medium text-slate-900"
              // FIX 5: minimum 16px to suppress Safari zoom
              style={{ fontSize: "16px" }}
            />
          </div>

          {/* Date — FIX 5 */}
          <div className="calendar-event-field flex items-center gap-3 py-2 border-b border-slate-100">
            <span className="text-slate-300 text-lg select-none">📅</span>
            <label htmlFor={`${mode}-event-date`} className="sr-only">{t("form.date")}</label>
            <input
              id={`${mode}-event-date`}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 text-slate-700 outline-none bg-transparent"
              style={{ fontSize: "16px" }}
            />
          </div>

          <div className="calendar-event-field flex items-center gap-3 py-2 border-b border-slate-100">
            <span className="text-slate-300 text-lg select-none">🕐</span>
            <label htmlFor={`${mode}-event-time`} className="sr-only">{t("form.time")}</label>
            <input
              id={`${mode}-event-time`}
              type="time"
              value={timeOfDay}
              onChange={(event) => setTimeOfDay(event.target.value)}
              className="flex-1 text-slate-700 outline-none bg-transparent"
              style={{ fontSize: "16px" }}
            />
            {timeOfDay && (
              <button type="button" onClick={() => setTimeOfDay("")} className="min-h-11 px-2 text-xs font-semibold text-slate-400">
                {t("form.clearTime")}
              </button>
            )}
          </div>

          <div className="calendar-event-field flex items-center gap-3 py-2 border-b border-slate-100">
            <span className="text-slate-300 text-lg select-none">⏳</span>
            <label htmlFor={`${mode}-event-duration`} className="sr-only">{t("form.duration")}</label>
            <input
              id={`${mode}-event-duration`}
              type="number"
              min="5"
              max="1440"
              step="5"
              placeholder={t("form.durationPlaceholder")}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
              className="min-w-0 flex-1 text-slate-700 outline-none bg-transparent"
              style={{ fontSize: "16px" }}
            />
            <span className="text-xs font-semibold text-slate-400">{t("form.minutes")}</span>
          </div>

          <div className="calendar-event-field flex items-center gap-3 py-2 border-b border-slate-100">
            <span className="text-slate-300 text-lg select-none">📍</span>
            <label htmlFor={`${mode}-event-location`} className="sr-only">{t("form.location")}</label>
            <input
              id={`${mode}-event-location`}
              type="text"
              maxLength={300}
              placeholder={t("form.locationPlaceholder")}
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="min-w-0 flex-1 text-slate-700 placeholder-slate-300 outline-none bg-transparent"
              style={{ fontSize: "16px" }}
            />
          </div>

          <div className="calendar-event-field flex items-center gap-3 py-2 border-b border-slate-100">
            <span className="text-slate-300 text-lg select-none">🚗</span>
            <label htmlFor={`${mode}-event-travel-buffer`} className="sr-only">{t("form.travelBuffer")}</label>
            <input
              id={`${mode}-event-travel-buffer`}
              type="number"
              min="5"
              max="240"
              step="5"
              placeholder={t("form.travelBufferPlaceholder")}
              value={travelBufferMinutes}
              onChange={(event) => setTravelBufferMinutes(event.target.value)}
              className="min-w-0 flex-1 text-slate-700 placeholder-slate-300 outline-none bg-transparent"
              style={{ fontSize: "16px" }}
            />
            <span className="text-xs font-semibold text-slate-400">{t("form.minutes")}</span>
          </div>

          {/* Category */}
          <div className="calendar-event-field calendar-event-categories flex items-center gap-3 py-2 border-b border-slate-100">
            <span className="text-slate-300 text-lg select-none">🏷️</span>
            <div className="flex gap-2 flex-1 flex-wrap">
              {CATEGORIES_ADD.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  aria-pressed={category === c.value}
                  className={`calendar-event-category h-10 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-[.97] ${
                    category === c.value
                      ? CAT_COLOR[c.value].pill +
                        " " +
                        CAT_COLOR[c.value].text +
                        " shadow-sm"
                      : "border-slate-200 text-slate-400 bg-white"
                  }`}
                >
                  <span>{c.emoji}</span> {t(`categories.${c.value}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="calendar-event-field flex items-center gap-3 py-2 border-b border-slate-100">
            <span className="text-slate-300 text-lg select-none">🔁</span>
            <label htmlFor={`${mode}-event-recurrence`} className="sr-only">
              {t("form.recurrence")}
            </label>
            <select
              id={`${mode}-event-recurrence`}
              value={recurrenceRule}
              onChange={(event) => setRecurrenceRule(event.target.value as EventRecurrenceRule)}
              className="flex-1 min-h-11 bg-transparent text-slate-700 outline-none"
              style={{ fontSize: "16px" }}
            >
              {(["none", "weekly", "monthly", "yearly"] as const).map((rule) => (
                <option key={rule} value={rule}>{t(`recurrence.${rule}`)}</option>
              ))}
            </select>
          </div>

          <div className="calendar-event-field flex items-center gap-3 py-2 border-b border-slate-100">
            <span className="text-slate-300 text-lg select-none">👤</span>
            <label htmlFor={`${mode}-event-person`} className="sr-only">
              {t("form.person")}
            </label>
            <select
              id={`${mode}-event-person`}
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="flex-1 text-slate-700 outline-none bg-transparent"
              style={{ fontSize: "16px" }}
            >
              <option value="">{t("form.noPerson")}</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isImportant}
            onClick={() => setIsImportant(!isImportant)}
            className={`calendar-event-reminder flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ${isImportant ? "calendar-event-reminder--active bg-amber-50" : "bg-slate-50"}`}
          >
            <span className="text-lg">🔔</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-800">{t("form.important")}</span>
              <span className="block text-xs text-slate-500">{t("form.importantHint")}</span>
            </span>
            <span className={`relative h-7 w-12 rounded-full transition-colors ${isImportant ? "bg-amber-400" : "bg-slate-200"}`}>
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${isImportant ? "translate-x-6" : "translate-x-1"}`} />
            </span>
          </button>

          {/* Notes — FIX 5 */}
          <div className="calendar-event-field flex items-center gap-3 py-2">
            <span className="text-slate-300 text-lg select-none">📝</span>
            <label htmlFor={`${mode}-event-notes`} className="sr-only">{t("form.notes")}</label>
            <input
              id={`${mode}-event-notes`}
              type="text"
              placeholder={t("form.notePlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex-1 text-slate-700 placeholder-slate-300 outline-none bg-transparent"
              style={{ fontSize: "16px" }}
            />
          </div>
        </div>

        {/* Delete */}
        {mode === "edit" && onDelete && (
          <div className="calendar-event-delete px-5 pb-6 border-t border-slate-100 pt-4">
            <button
              onClick={onDelete}
              className="w-full h-12 rounded-2xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              🗑️ {t("form.delete")}
            </button>
          </div>
        )}

        {/* Bottom breathing room for add mode (above safe-area pb) */}
        {mode === "add" && <div className="h-6" />}
      </div>
    </div>
  );
}

function DayPlanSheet({
  dateLabel,
  events,
  fixedEvents,
  uncertainFixedCount,
  deferredCount,
  initialPreferences,
  onCancel,
  onSave,
  onSavePreferences,
}: {
  dateLabel: string;
  events: EventRow[];
  fixedEvents: DayPlanFixedEvent[];
  uncertainFixedCount: number;
  deferredCount: number;
  initialPreferences: PlannerPreferences;
  onCancel: () => void;
  onSave: (items: DayPlanDraftItem[], window: { startTime: string; endTime: string }) => Promise<void>;
  onSavePreferences: (preferences: PlannerPreferences) => Promise<void>;
}) {
  const t = useTranslations("dashboard");
  const ref = useFocusTrap(true);
  const [startTime, setStartTime] = useState(initialPreferences.dayStart);
  const [endTime, setEndTime] = useState(initialPreferences.dayEnd);
  const [gapMinutes, setGapMinutes] = useState(initialPreferences.defaultGapMinutes);
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState(initialPreferences.defaultDurationMinutes);
  const [draft, setDraft] = useState<DayPlanDraftItem[]>(() =>
    buildDayPlanDraft(events, initialPreferences.dayStart, initialPreferences.defaultGapMinutes, initialPreferences.defaultDurationMinutes, fixedEvents, initialPreferences.dayEnd) ?? [],
  );
  const [excluded, setExcluded] = useState<DayPlanDraftItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const importantEventIds = useMemo(() => new Set(events.filter((event) => event.isImportant).map((event) => event.id)), [events]);
  const summary = useMemo(() => summarizeDayPlanDraft(draft), [draft]);

  useBodyScrollLock(true);

  const regenerate = () => {
    const excludedIds = new Set(excluded.map((item) => item.eventId));
    const next = buildDayPlanDraft(events.filter((event) => !excludedIds.has(event.id)), startTime, gapMinutes, defaultDurationMinutes, fixedEvents, endTime);
    if (!next) {
      setError(t("dayPlan.rangeError"));
      return;
    }
    setError(null);
    setDraft(next);
  };

  const save = async () => {
    if (draft.length === 0 || new Set(draft.map((item) => item.eventId)).size !== draft.length || draft.some((item) => !isValidDayPlanItemWithinWindow(item, startTime, endTime))) {
      setError(t("dayPlan.validationError"));
      return;
    }
    if (findDayPlanConflicts(draft, fixedEvents).length > 0) {
      setError(t("dayPlan.conflictError"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(draft, { startTime, endTime });
    } catch {
      setError(t("dayPlan.saveError"));
    } finally {
      setBusy(false);
    }
  };

  const saveDefaults = async () => {
    if (!buildDayPlanDraft([], startTime, gapMinutes, defaultDurationMinutes, [], endTime)) {
      setError(t("dayPlan.validationError"));
      return;
    }
    setSavingPreferences(true);
    setPreferencesSaved(false);
    setError(null);
    try {
      await onSavePreferences({
        dayStart: startTime,
        dayEnd: endTime,
        defaultDurationMinutes,
        defaultGapMinutes: gapMinutes,
      });
      setPreferencesSaved(true);
    } catch {
      setError(t("dayPlan.preferencesSaveError"));
    } finally {
      setSavingPreferences(false);
    }
  };

  const moveDraft = (eventId: string, direction: DayPlanMoveDirection) => {
    const next = reorderDayPlanDraft(draft, eventId, direction, startTime, gapMinutes, fixedEvents, endTime);
    if (!next) {
      setError(t("dayPlan.rangeError"));
      return;
    }
    setError(null);
    setDraft(next);
  };

  const excludeFromDraft = (eventId: string) => {
    const removed = draft.find((item) => item.eventId === eventId);
    if (!removed) return;
    const next = reflowDayPlanDraft(draft.filter((item) => item.eventId !== eventId), startTime, gapMinutes, fixedEvents, endTime);
    if (!next) {
      setError(t("dayPlan.rangeError"));
      return;
    }
    setError(null);
    setDraft(next);
    setExcluded((current) => [...current, removed]);
  };

  const restoreToDraft = (eventId: string) => {
    const restored = excluded.find((item) => item.eventId === eventId);
    if (!restored) return;
    const next = reflowDayPlanDraft([...draft, restored], startTime, gapMinutes, fixedEvents, endTime);
    if (!next) {
      setError(t("dayPlan.rangeError"));
      return;
    }
    setError(null);
    setDraft(next);
    setExcluded((current) => current.filter((item) => item.eventId !== eventId));
  };

  const changeDraftDuration = (eventId: string, durationMinutes: number) => {
    const next = resizeDayPlanDraft(draft, eventId, durationMinutes, startTime, gapMinutes, fixedEvents, endTime);
    if (!next) {
      setError(isValidEventDuration(durationMinutes) ? t("dayPlan.rangeError") : t("validation.duration"));
      return;
    }
    setError(null);
    setDraft(next);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="day-plan-title" className="fixed inset-0 z-[360] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[3px]" onClick={busy ? undefined : onCancel} />
      <div ref={ref} className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-[2rem] border border-white/40 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl sm:rounded-[2rem]">
        <div className="flex justify-center pb-1 pt-3 sm:hidden"><div className="h-[3px] w-9 rounded-full bg-slate-200" /></div>
        <header className="border-b border-slate-100 px-5 pb-4 pt-2">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={onCancel} disabled={busy} className="min-h-11 text-sm font-semibold text-slate-500 disabled:opacity-50">{t("common.cancel")}</button>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-sky-700">{t("dayPlan.draftBadge")}</span>
          </div>
          <h2 id="day-plan-title" className="mt-2 text-xl font-black tracking-tight text-slate-950">{t("dayPlan.title")}</h2>
          <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.08em] text-sky-600">{dateLabel}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{t("dayPlan.description")}</p>
        </header>

        {events.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="text-3xl" aria-hidden="true">✨</div>
            <p className="mt-3 font-bold text-slate-800">{t("dayPlan.emptyTitle")}</p>
            <p className="mt-1 text-sm text-slate-500">{t("dayPlan.emptyDescription")}</p>
            <button type="button" onClick={onCancel} className="hd-button mt-5 min-h-11 w-full bg-sky-500 text-white">{t("dayPlan.close")}</button>
          </div>
        ) : (
          <div className="px-5 py-5">
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-sky-50 p-3 sm:grid-cols-4">
              <label className="text-xs font-bold text-slate-600">
                {t("dayPlan.startTime")}
                <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-sky-100 bg-white px-3 text-base text-slate-800 outline-none focus:border-sky-400" />
              </label>
              <label className="text-xs font-bold text-slate-600">
                {t("dayPlan.endTime")}
                <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-sky-100 bg-white px-3 text-base text-slate-800 outline-none focus:border-sky-400" />
              </label>
              <label className="text-xs font-bold text-slate-600">
                {t("dayPlan.defaultDuration")}
                <input type="number" min="5" max="1440" step="5" value={defaultDurationMinutes} onChange={(event) => setDefaultDurationMinutes(Number(event.target.value))} className="mt-1 min-h-11 w-full rounded-xl border border-sky-100 bg-white px-3 text-base text-slate-800 outline-none focus:border-sky-400" />
              </label>
              <label className="text-xs font-bold text-slate-600">
                {t("dayPlan.gap")}
                <input type="number" min="0" max="240" step="5" value={gapMinutes} onChange={(event) => setGapMinutes(Number(event.target.value))} className="mt-1 min-h-11 w-full rounded-xl border border-sky-100 bg-white px-3 text-base text-slate-800 outline-none focus:border-sky-400" />
              </label>
            </div>
            <button type="button" onClick={regenerate} className="mt-3 min-h-11 w-full rounded-xl border border-sky-200 text-sm font-extrabold text-sky-700 hover:bg-sky-50">{t("dayPlan.rebuild")}</button>
            <button type="button" onClick={saveDefaults} disabled={busy || savingPreferences} className="mt-2 min-h-11 w-full rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50">
              {savingPreferences ? t("dayPlan.savingPreferences") : preferencesSaved ? t("dayPlan.preferencesSaved") : t("dayPlan.savePreferences")}
            </button>

            {fixedEvents.length > 0 && (
              <p className="mt-3 rounded-2xl bg-emerald-50 px-3.5 py-3 text-xs leading-relaxed text-emerald-900">
                {t("dayPlan.fixedProtected", { count: fixedEvents.length })}
              </p>
            )}
            {uncertainFixedCount > 0 && (
              <p className="mt-3 rounded-2xl bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-900">
                {t("dayPlan.missingFixedDuration", { count: uncertainFixedCount })}
              </p>
            )}
            {deferredCount > 0 && (
              <p className="mt-3 rounded-2xl bg-violet-50 px-3.5 py-3 text-xs leading-relaxed text-violet-900">
                {t("dayPlan.deferred", { count: deferredCount })}
              </p>
            )}

            <p className="mt-4 text-xs leading-relaxed text-slate-500">{t("dayPlan.priorityHint")} {t("dayPlan.reorderHint")}</p>

            <ul className="mt-2 space-y-2">
              {draft.map((item, index) => (
                <li key={item.eventId} className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:grid-cols-[auto_1fr_auto_auto_auto_auto]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-xs font-black text-sky-700">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">
                    {importantEventIds.has(item.eventId) && <span className="mr-1 text-rose-500" aria-label={t("dayPlan.important")}>♥</span>}
                    {item.title}
                    {item.travelBufferMinutes && <span className="ml-2 text-[10px] font-bold text-slate-400">🚗 {item.travelBufferMinutes} {t("form.minutes")}</span>}
                  </span>
                  <div className="col-start-2 flex gap-1 sm:col-start-auto">
                    <button type="button" onClick={() => moveDraft(item.eventId, "up")} disabled={index === 0 || busy} aria-label={t("dayPlan.moveUp", { title: item.title })} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => moveDraft(item.eventId, "down")} disabled={index === draft.length - 1 || busy} aria-label={t("dayPlan.moveDown", { title: item.title })} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 disabled:opacity-30">↓</button>
                  </div>
                  <button type="button" onClick={() => excludeFromDraft(item.eventId)} disabled={busy} className="col-start-2 min-h-11 rounded-xl px-2 text-left text-xs font-semibold text-slate-400 hover:bg-slate-50 sm:col-start-auto" aria-label={t("dayPlan.exclude", { title: item.title })}>{t("dayPlan.excludeShort")}</button>
                  <label className="sr-only" htmlFor={`day-plan-${item.eventId}`}>{t("dayPlan.eventTime", { title: item.title })}</label>
                  <input id={`day-plan-${item.eventId}`} type="time" value={item.timeOfDay} onChange={(event) => setDraft((current) => current.map((entry) => entry.eventId === item.eventId ? { ...entry, timeOfDay: event.target.value } : entry))} className="col-start-2 min-h-11 w-[7.5rem] rounded-xl border border-slate-200 px-2 text-base font-bold text-slate-700 outline-none focus:border-sky-400 sm:col-start-auto" />
                  <label className="sr-only" htmlFor={`day-plan-duration-${item.eventId}`}>{t("dayPlan.eventDuration", { title: item.title })}</label>
                  <div className="col-start-2 flex items-center gap-2 sm:col-start-auto">
                    <input id={`day-plan-duration-${item.eventId}`} type="number" min="5" max="1440" step="5" value={item.durationMinutes} onChange={(event) => changeDraftDuration(item.eventId, Number(event.target.value))} className="min-h-11 w-20 rounded-xl border border-slate-200 px-2 text-base font-bold text-slate-700 outline-none focus:border-sky-400" />
                    <span className="text-xs font-semibold text-slate-400">{t("form.minutes")}</span>
                  </div>
                </li>
              ))}
            </ul>

            {summary && (
              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3" aria-live="polite">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">{t("dayPlan.summaryTitle")}</p>
                <p className="mt-1 text-sm font-bold leading-relaxed text-emerald-950">
                  {t("dayPlan.summary", { count: summary.taskCount, minutes: summary.focusMinutes, time: summary.finishTime })}
                </p>
                {summary.travelMinutes > 0 && <p className="mt-1 text-xs font-semibold text-emerald-800">{t("dayPlan.travelSummary", { minutes: summary.travelMinutes })}</p>}
              </div>
            )}

            {excluded.length > 0 && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">{t("dayPlan.excludedTitle")}</p>
                <ul className="mt-2 space-y-2">
                  {excluded.map((item) => (
                    <li key={item.eventId} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-600">{item.title}</span>
                      <button type="button" onClick={() => restoreToDraft(item.eventId)} disabled={busy} className="min-h-11 rounded-xl px-3 text-xs font-bold text-sky-700 hover:bg-sky-50" aria-label={t("dayPlan.restore", { title: item.title })}>{t("dayPlan.restoreShort")}</button>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("dayPlan.excludedHint")}</p>
              </div>
            )}

            <div className="mt-4 rounded-2xl bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-900">{t("dayPlan.confirmationNote")}</div>
            {error && <p className="mt-3 text-sm font-semibold text-rose-600" role="alert">{error}</p>}
            <button type="button" onClick={save} disabled={busy || draft.length === 0} className="hd-button mt-4 min-h-12 w-full bg-sky-500 text-white disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? t("dayPlan.saving") : t("dayPlan.save")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   DAY DETAIL SHEET
   Same iOS fixes: scroll lock, max-h-[92dvh], safe-area, 16px inputs
═══════════════════════════════════════════════════ */
function DayDetailSheet({
  dateYMD,
  events,
  insights,
  onClose,
  onAdd,
  onPlan,
  onEdit,
}: {
  dateYMD: string;
  events: EventRow[];
  insights: Map<string, string>;
  onClose: () => void;
  onAdd: (ymd: string) => void;
  onPlan: (ymd: string) => void;
  onEdit: (id: string) => void;
}) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const ref = useFocusTrap(true);
  const today = todayYMD();
  const isToday = dateYMD === today;

  useBodyScrollLock(true);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-day-title"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={ref}
        className="
          relative bg-white w-full max-w-lg
          rounded-t-[2rem] sm:rounded-[2rem]
          shadow-2xl border-t sm:border border-white/40
          max-h-[92dvh]
          flex flex-col
          pb-[env(safe-area-inset-bottom)]
        "
        style={{ animation: "sheetUp .28s cubic-bezier(.34,1.56,.64,1) both" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 flex-shrink-0 sm:hidden">
          <div className="w-9 h-[3px] rounded-full bg-slate-200" />
        </div>

        {/* Date header — flex-shrink-0 so it never scrolls away */}
        <div className="px-5 pt-3 pb-3 flex items-end justify-between flex-shrink-0">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              {new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
                parseLocalDateOnly(dateYMD) ?? new Date(Number.NaN)
              )}
            </p>
            <h3 id="calendar-day-title" className="text-xl font-extrabold text-slate-900 leading-tight flex items-center gap-2">
              {new Intl.DateTimeFormat(locale, {
                day: "numeric",
                month: "long",
              }).format(parseLocalDateOnly(dateYMD) ?? new Date(Number.NaN))}
              {isToday && (
                <span className="text-xs font-bold bg-sky-500 text-white px-2 py-0.5 rounded-full">
                  {t("day.today")}
                </span>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAdd(dateYMD)}
              className="h-9 px-4 rounded-2xl bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 transition-colors shadow-sm shadow-sky-200 flex items-center gap-1.5"
            >
              <span className="text-base leading-none">＋</span> {t("common.add")}
            </button>
            <button
              onClick={onClose}
              aria-label={t("accessibility.closeDay")}
              className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Events — scrollable, overscroll-contain stops bounce-through */}
        <div className="px-4 pb-6 overflow-y-auto overscroll-contain flex-1">
          {dateYMD >= today && (
            <button
              type="button"
              onClick={() => onPlan(dateYMD)}
              className="mb-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 text-sm font-extrabold text-sky-700 transition-colors hover:bg-sky-100"
            >
              <span aria-hidden="true">✨</span> {t("dayPlan.planAction")}
            </button>
          )}
          {events.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">🌙</p>
              <p className="text-sm text-slate-400">{t("day.empty")}</p>
              <button
                onClick={() => onAdd(dateYMD)}
                className="mt-3 text-xs text-sky-500 font-semibold hover:text-sky-700 transition-colors"
              >
                + {t("day.addFirst")}
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {events.map((ev) => {
                const isBirthday = ev.id.startsWith("birthday-");
                const cat = ev.category ?? "default";
                const colors = CAT_COLOR[cat] ?? CAT_COLOR.default;
                const insight = insights.get(ev.id);
                const cleanTitle = ev.title.replace(/^🎂\s*/, "");

                return (
                  <li
                    key={ev.id}
                    className={`rounded-2xl border p-3.5 transition-all ${
                      !isBirthday
                        ? "cursor-pointer hover:shadow-sm active:scale-[.99]"
                        : ""
                    } ${colors.pill}`}
                    onClick={() => !isBirthday && onEdit(ev.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                          isBirthday
                            ? "bg-pink-100 text-pink-600"
                            : avatarClass(cleanTitle)
                        }`}
                      >
                        {isBirthday ? "🎂" : getInitials(cleanTitle)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 justify-between">
                          <p
                            className={`font-bold text-sm leading-tight ${colors.text}`}
                          >
                            {cleanTitle}
                          </p>
                          {isBirthday && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-500 border border-purple-200 font-bold shrink-0">
                              {t("day.auto")}
                            </span>
                          )}
                        </div>
                        {ev.notes && !isBirthday && (
                          <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                            {ev.notes}
                          </p>
                        )}
                        {ev.personName && !isBirthday && (
                          <p className="text-[11px] text-slate-500 mt-1">👤 {ev.personName}</p>
                        )}
                        {ev.timeOfDay && !isBirthday && (
                          <p className="text-[11px] font-semibold text-slate-500 mt-1">🕐 {ev.timeOfDay}{ev.durationMinutes ? ` · ${ev.durationMinutes} ${t("form.minutes")}` : ""}</p>
                        )}
                        {ev.location && !isBirthday && (
                          <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">📍 {ev.location}</p>
                        )}
                        {ev.travelBufferMinutes && !isBirthday && (
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">🚗 {t("day.travelBuffer", { minutes: ev.travelBufferMinutes })}</p>
                        )}
                        {insight && (
                          <p className="text-[11px] text-violet-500 mt-1.5 font-medium flex items-center gap-1">
                            <span>✨</span> {insight}
                          </p>
                        )}
                      </div>
                      {!isBirthday && (
                        <Link
                          href={`/gift/start?eventId=${
                            ev.id
                          }&date=${encodeURIComponent(
                            ev.date
                          )}&title=${encodeURIComponent(ev.title)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-8 h-8 rounded-xl bg-white/70 border border-white flex items-center justify-center text-sm hover:bg-white transition-colors shrink-0"
                          title={t("day.giftIdea")}
                        >
                          🎁
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   UPCOMING STRIP — horizontal scroll pills
═══════════════════════════════════════════════════ */
function UpcomingStrip({
  events,
  insights,
  onTap,
}: {
  events: EventRow[];
  insights: Map<string, string>;
  onTap: (dateYMD: string) => void;
}) {
  const t = useTranslations("dashboard");
  if (!events.length) return null;

  return (
    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
      <div className="flex gap-2 pb-0.5" style={{ width: "max-content" }}>
        {events.map((ev, i) => {
          const cat = ev.category ?? "default";
          const colors = CAT_COLOR[cat] ?? CAT_COLOR.default;
          const diff = daysLeft(ev.date);
          const isToday = diff === 0;
          const cleanName = ev.title.replace(/^🎂\s*/, "");
          const insight = insights.get(ev.id);

          return (
            <button
              key={ev.id}
              onClick={() => onTap(ev.date)}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl border text-left transition-all active:scale-[.97] hover:shadow-sm ${
                isToday
                  ? "bg-sky-500 border-sky-500 text-white shadow-sm shadow-sky-200"
                  : colors.pill
              }`}
              style={{ animation: `stripIn .3s ease ${i * 0.05}s both` }}
            >
              <span className="text-base leading-none">
                {CAT_EMOJI[cat] ?? "📌"}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-xs font-bold leading-tight truncate max-w-[100px] ${
                    isToday ? "text-white" : colors.text
                  }`}
                >
                  {cleanName}
                </p>
                <p
                  className={`text-[10px] font-semibold ${
                    isToday ? "text-white/80" : "text-slate-400"
                  }`}
                >
                  {ev.timeOfDay && isToday ? `${ev.timeOfDay}${ev.durationMinutes ? ` · ${ev.durationMinutes} ${t("form.minutes")}` : ""}` : daysLabel(ev.date, t)}
                </p>
                {insight && !isToday && (
                  <p className="text-[9px] text-violet-400 mt-0.5 font-medium">
                    ✨ {insight.slice(0, 20)}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MINI CALENDAR GRID
═══════════════════════════════════════════════════ */
function CalendarGrid({
  year,
  month,
  events,
  selectedDate,
  onSelectDate,
  onNavigateDate,
  onPreviousMonth,
  onNextMonth,
}: {
  year: number;
  month: number;
  events: EventRow[];
  selectedDate: string | null;
  onSelectDate: (ymd: string) => void;
  onNavigateDate: (ymd: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const today = todayYMD();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventMap = useMemo(() => {
    const m = new Map<string, EventRow[]>();
    events.forEach((ev) => {
      const key = ev.date.slice(0, 7);
      const ym = `${year}-${String(month + 1).padStart(2, "0")}`;
      if (key !== ym) return;
      const prev = m.get(ev.date) ?? [];
      m.set(ev.date, [...prev, ev]);
    });
    return m;
  }, [events, year, month]);

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div
      className="w-full touch-pan-y"
      role="grid"
      aria-label={t("accessibility.calendarLabel", {
        month: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(year, month, 1)),
      })}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const touch = event.changedTouches[0];
        touchStart.current = null;
        if (!start || !touch) return;
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        if (Math.abs(dx) < 56 || Math.abs(dx) <= Math.abs(dy) * 1.25) return;
        if (dx < 0) onNextMonth();
        else onPreviousMonth();
      }}
    >
      <div className="grid grid-cols-7 mb-1" role="row">
        {Array.from({ length: 7 }, (_, index) =>
          new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
            new Date(2024, 0, 1 + index)
          )
        ).map((d) => (
          <div
            key={d}
            role="columnheader"
            className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5" role="rowgroup">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;

          const dateStr = `${year}-${String(month + 1).padStart(
            2,
            "0"
          )}-${String(day).padStart(2, "0")}`;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const dayEvents = eventMap.get(dateStr) ?? [];
          const hasImportantEvent = dayEvents.some((event) => event.isImportant);
          const dots = [
            ...new Set(dayEvents.map((e) => e.category ?? "default")),
          ].slice(0, 3);

          return (
            <button
              key={dateStr}
              role="gridcell"
              data-calendar-date={dateStr}
              onClick={() => onSelectDate(dateStr)}
              onKeyDown={(event) => {
                const offsets: Partial<Record<typeof event.key, number>> = {
                  ArrowLeft: -1,
                  ArrowRight: 1,
                  ArrowUp: -7,
                  ArrowDown: 7,
                };
                const offset = offsets[event.key];
                if (offset === undefined) return;
                event.preventDefault();
                const target = addLocalDateOnlyDays(dateStr, offset);
                if (target) onNavigateDate(target);
              }}
              aria-label={t("accessibility.dayLabel", {
                date: new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
                  .format(parseLocalDateOnly(dateStr) ?? new Date(Number.NaN)),
                count: dayEvents.length,
              })}
              aria-current={isToday ? "date" : undefined}
              aria-selected={isSelected}
              className={`relative flex flex-col items-center justify-start py-1.5 rounded-xl transition-all active:scale-[.92] min-h-[52px] ${
                isSelected
                  ? "bg-sky-500 shadow-md shadow-sky-200"
                  : isToday
                  ? "bg-sky-50 ring-1 ring-sky-200"
                  : "hover:bg-slate-50"
              }`}
            >
              <span
                className={`text-sm font-bold leading-none ${
                  isSelected
                    ? "text-white"
                    : isToday
                    ? "text-sky-600"
                    : "text-slate-800"
                }`}
              >
                {day}
              </span>
              {dots.length > 0 && (
                <div className="flex gap-0.5 mt-1.5 items-center">
                  {dots.map((cat, di) => (
                    <span
                      key={di}
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected
                          ? "bg-white/80"
                          : CAT_COLOR[cat]?.dot ?? CAT_COLOR.default.dot
                      }`}
                    />
                  ))}
                </div>
              )}
              {hasImportantEvent && !isSelected && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400 ring-2 ring-amber-100" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SEARCH OVERLAY
   iOS fixes: scroll lock, safe-area, 16px input
═══════════════════════════════════════════════════ */
function SearchOverlay({
  events,
  insights,
  onClose,
  onEdit,
}: {
  events: EventRow[];
  insights: Map<string, string>;
  onClose: () => void;
  onEdit: (id: string) => void;
}) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useFocusTrap(true);

  useBodyScrollLock(true);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const results = useMemo(() => {
    const lower = q.trim().toLowerCase();
    if (!lower) return [];
    return events
      .filter((ev) =>
        `${ev.title} ${ev.notes ?? ""}`.toLowerCase().includes(lower)
      )
      .slice(0, 20);
  }, [events, q]);

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[400] flex flex-col bg-white"
      style={{
        animation: "fadeInFull .2s ease both",
        // Push content up when keyboard appears on iOS
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      {/* Search bar */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-2xl px-3 h-11">
          <span className="text-slate-400 text-sm">🔍</span>
          <input
            ref={inputRef}
            type="search"
            placeholder={t("search.placeholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 text-slate-900 bg-transparent outline-none placeholder-slate-400"
            // FIX 5: 16px prevents Safari zoom on focus
            style={{ fontSize: "16px" }}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="text-slate-400 text-xs font-bold hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-sm font-medium text-sky-500 hover:text-sky-700 transition-colors whitespace-nowrap"
        >
          {t("common.cancel")}
        </button>
      </div>

      {/* Results — overscroll-contain prevents scroll bleed to body */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        {!q.trim() ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm text-slate-400">{t("search.start")}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🌸</p>
            <p className="text-sm text-slate-400">
              {t("search.empty", { query: q })}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {results.map((ev) => {
              const isBirthday = ev.id.startsWith("birthday-");
              const cat = ev.category ?? "default";
              const colors = CAT_COLOR[cat] ?? CAT_COLOR.default;
              const cleanTitle = ev.title.replace(/^🎂\s*/, "");
              const insight = insights.get(ev.id);

              return (
                <li
                  key={ev.id}
                  className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (!isBirthday) {
                      onEdit(ev.id);
                      onClose();
                    }
                  }}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${colors.pill} ${colors.text} font-bold border`}
                  >
                    {CAT_EMOJI[cat] ?? "📌"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm leading-tight">
                      {cleanTitle}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-400">
                        {formatDateShort(ev.date, locale)}
                        {ev.timeOfDay ? ` · ${ev.timeOfDay}` : ""}{ev.durationMinutes ? ` · ${ev.durationMinutes} ${t("form.minutes")}` : ""}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${urgencyBadge(
                          ev.date
                        )}`}
                      >
                        {daysLabel(ev.date, t)}
                      </span>
                    </div>
                    {insight && (
                      <p className="text-[11px] text-violet-500 mt-1">
                        ✨ {insight}
                      </p>
                    )}
                    {ev.notes && !isBirthday && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {ev.notes}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN — CALENDAR PAGE
═══════════════════════════════════════════════════ */
export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("dashboard");

  const [events, setEvents] = useState<EventRow[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [plannerPreferences, setPlannerPreferences] = useState<PlannerPreferences>(DEFAULT_PLANNER_PREFERENCES);
  const [loading, setLoading] = useState(true);

  const [currentYear] = useState(() => new Date().getFullYear());
  const [viewYear, setViewYear] = useState(currentYear);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [mDate, setMDate] = useState("");
  const [mTimeOfDay, setMTimeOfDay] = useState("");
  const [mDurationMinutes, setMDurationMinutes] = useState("");
  const [mLocation, setMLocation] = useState("");
  const [mTravelBufferMinutes, setMTravelBufferMinutes] = useState("");
  const [mTitle, setMTitle] = useState("");
  const [mNotes, setMNotes] = useState("");
  const [mCat, setMCat] = useState("personal");
  const [mPersonId, setMPersonId] = useState("");
  const [mIsImportant, setMIsImportant] = useState(false);
  const [mRecurrenceRule, setMRecurrenceRule] = useState<EventRecurrenceRule>("none");

  const [editOpen, setEditOpen] = useState(false);
  const [dayPlanDate, setDayPlanDate] = useState<string | null>(null);
  const [eId, setEId] = useState("");
  const [eTitle, setETitle] = useState("");
  const [eDate, setEDate] = useState("");
  const [eTimeOfDay, setETimeOfDay] = useState("");
  const [eDurationMinutes, setEDurationMinutes] = useState("");
  const [eLocation, setELocation] = useState("");
  const [eTravelBufferMinutes, setETravelBufferMinutes] = useState("");
  const [eNotes, setENotes] = useState("");
  const [eCat, setECat] = useState("personal");
  const [ePersonId, setEPersonId] = useState("");
  const [eIsImportant, setEIsImportant] = useState(false);
  const [eRecurrenceRule, setERecurrenceRule] = useState<EventRecurrenceRule>("none");

  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const { toasts, push } = useToasts();
  const fileRef = useRef<HTMLInputElement>(null);
  const assistantActionConsumedRef = useRef(false);
  const assistantDraftRef = useRef<{ action: "add-event" | "plan-day"; personId: string | null } | null>(null);

  /* ── Init + realtime ── */
  useEffect(() => {
    let ch: RealtimeChannel | null = null;
    let cancelled = false;
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const [eventResult, { data: peopleData }, preferencesResult] = await Promise.all([
          listCalendarEvents(user.id).then(
            (data) => ({ data, error: null }),
            (error) => ({ data: null, error }),
          ),
          supabase
            .from("people")
            .select("id,name,birthday,notes")
            .eq("user_id", user.id)
            .order("name", { ascending: true }),
          loadPlannerPreferences(user.id).then(
            (data) => ({ data, error: null }),
            (error) => ({ data: null, error }),
          ),
        ]);

      if (cancelled) return;

      if (eventResult.error) push({ type: "error", msg: t("toast.loadError") });
      if (eventResult.data) setEvents(eventResult.data);
      if (peopleData) setPeople(peopleData as PersonRow[]);
      if (preferencesResult.data) setPlannerPreferences(preferencesResult.data);
      if (preferencesResult.error) push({ type: "error", msg: t("dayPlan.preferencesLoadError") });
      setLoading(false);

      ch = supabase
        // Each effect instance needs its own channel. React Strict Mode can
        // briefly overlap async effect lifecycles during development.
        .channel(`cal-ch-${user.id}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "events",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: RealtimePostgresChangesPayload<RealtimeEventRow>) => {
            const sort = (arr: EventRow[]) =>
              [...arr].sort((a, b) => a.date.localeCompare(b.date));
            if (payload.eventType === "INSERT") {
              const incoming = mapRealtimeEvent(payload.new as RealtimeEventRow);
              setEvents((current) => sort([
                ...current.filter((event) => event.id !== incoming.id),
                incoming,
              ]));
            }
            if (payload.eventType === "UPDATE") {
              const incoming = mapRealtimeEvent(payload.new as RealtimeEventRow);
              setEvents((p) =>
                sort(
                  p.map((e) =>
                    e.id === incoming.id ? incoming : e
                  )
                )
              );
            }
            if (payload.eventType === "DELETE")
              setEvents((p) =>
                p.filter((e) => e.id !== (payload.old as RealtimeEventRow).id)
              );
          }
        )
        .subscribe();
    };
    init();
    return () => {
      cancelled = true;
      if (ch) supabase.removeChannel(ch);
    };
  }, [router, push, t]);

  /* ── Birthday events ── */
  const birthdayEvents = useMemo<EventRow[]>(() => {
    return people
      .filter((p) => !!p.birthday)
      .flatMap((p): EventRow[] => {
        const bd = parseLocalDateOnly(p.birthday!);
        if (!bd) return [];
        const mon = String(bd.getMonth() + 1).padStart(2, "0");
        const day = String(bd.getDate()).padStart(2, "0");
        return [{
          id: `birthday-${p.id}`,
          title: `🎂 ${p.name}`,
          date: `${viewYear}-${mon}-${day}`,
          timeOfDay: null,
          durationMinutes: null,
          location: null,
          travelBufferMinutes: null,
          notes: null,
          category: "birthday",
          personId: p.id,
          personName: p.name,
          isImportant: true,
          recurrenceRule: "none",
        }];
      });
  }, [people, viewYear]);

  const allEvents = useMemo(() => {
    const rangeStart = `${viewYear - 1}-01-01`;
    const rangeEnd = `${viewYear + 1}-12-31`;
    const occurrences = expandCalendarEventOccurrences(events, rangeStart, rangeEnd);
    const persistedBirthdays = new Set(
      occurrences
        .filter((event) => event.category === "birthday" && event.personId)
        .map((event) => `${event.personId}:${event.date}`),
    );
    const syntheticBirthdays = birthdayEvents
      .filter((event) => !persistedBirthdays.has(`${event.personId}:${event.date}`))
      .map((event) => ({ ...event, sourceEventId: event.id }));
    return [...occurrences, ...syntheticBirthdays]
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events, birthdayEvents, viewYear]);

  const aiInsights = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    people.forEach((p) => {
      const insight = getAIInsight(p);
      if (insight)
        map.set(
          `birthday-${p.id}`,
          `${p.name} ${t(`insight.topics.${insight}`)}`
        );
    });
    events.forEach((ev) => {
      if (ev.notes && ev.notes.length > 8) {
        const d = daysLeft(ev.date);
        if (d > 0 && d <= 14)
          map.set(
            ev.id,
            t("insight.note", {
              value: `${ev.notes.slice(0, 45)}${
                ev.notes.length > 45 ? "…" : ""
              }`,
            })
          );
      }
    });
    return map;
  }, [people, events, t]);

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30 = new Date(today);
    in30.setDate(today.getDate() + 30);
    return allEvents
      .filter((e) => {
        const d = parseLocalDateOnly(e.date);
        if (!d) return false;
        return d >= today && d <= in30;
      })
      .slice(0, 12);
  }, [allEvents]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return allEvents.filter((e) => e.date === selectedDate);
  }, [allEvents, selectedDate]);

  const dayPlanCandidates = useMemo(() => selectDayPlanCandidates(events
    .filter((event) => event.date === dayPlanDate && !event.timeOfDay && event.category !== "birthday" && event.recurrenceRule === "none")), [dayPlanDate, events]);
  const dayPlanEvents = dayPlanCandidates.selected;

  const dayPlanFixedEvents = useMemo<DayPlanFixedEvent[]>(() => allEvents
    .filter((event) => event.date === dayPlanDate && event.timeOfDay && isValidEventDuration(event.durationMinutes ?? 0))
    .map((event) => ({
      id: event.id,
      title: event.title,
      timeOfDay: event.timeOfDay!,
      durationMinutes: event.durationMinutes!,
      travelBufferMinutes: event.travelBufferMinutes ?? undefined,
    })), [allEvents, dayPlanDate]);

  const dayPlanUncertainFixedCount = useMemo(() => allEvents.filter((event) =>
    event.date === dayPlanDate && event.timeOfDay && !isValidEventDuration(event.durationMinutes ?? 0)
  ).length, [allEvents, dayPlanDate]);

  /* ── Navigation ── */
  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);
  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);
  const goToday = useCallback(() => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setSelectedDate(todayYMD());
  }, []);

  /* ── Handlers ── */
  const openAdd = useCallback((ymd_?: string, initialPersonId = "") => {
    const d = ymd_ ?? todayYMD();
    setMDate(d);
    setMTimeOfDay("");
    setMDurationMinutes("");
    setMLocation("");
    setMTravelBufferMinutes("");
    setMTitle("");
    setMNotes("");
    setMCat("personal");
    setMPersonId(initialPersonId);
    setMIsImportant(false);
    setMRecurrenceRule("none");
    setAddOpen(true);
  }, []);

  useEffect(() => {
    const action = searchParams.get("action");
    if (assistantActionConsumedRef.current || (action !== "add-event" && action !== "plan-day")) return;
    assistantActionConsumedRef.current = true;
    assistantDraftRef.current = { action, personId: searchParams.get("personId") };
    router.replace("/dashboard", { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    const requestedDraft = assistantDraftRef.current;
    if (loading || !requestedDraft) return;
    assistantDraftRef.current = null;
    const safePersonId = requestedDraft.personId
      && people.some((person) => person.id === requestedDraft.personId)
      ? requestedDraft.personId
      : "";
    // The Assistant opens only a Calendar-owned draft. A suggested person is
    // accepted after the owner-scoped People load; saving remains explicit.
    queueMicrotask(() => {
      if (requestedDraft.action === "add-event") openAdd(undefined, safePersonId);
      if (requestedDraft.action === "plan-day") setDayPlanDate(todayYMD());
    });
  }, [loading, openAdd, people]);

  const mergeEvents = useCallback((incoming: EventRow[]) => {
    setEvents((current) => {
      const byId = new Map(current.map((event) => [event.id, event]));
      incoming.forEach((event) => byId.set(event.id, event));
      return [...byId.values()].sort((a, b) => a.date.localeCompare(b.date));
    });
  }, []);

  const saveDayPlan = async (items: DayPlanDraftItem[], window: { startTime: string; endTime: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/login");
      throw new Error("authentication_required");
    }
    const draftsById = new Map(items.map((item) => [item.eventId, item]));
    const candidates = dayPlanEvents.filter((event) => draftsById.has(event.id));
    if (items.length === 0 || draftsById.size !== items.length || candidates.length !== items.length || candidates.some((event) => {
      const item = draftsById.get(event.id);
      return !item || !isValidDayPlanItemWithinWindow(item, window.startTime, window.endTime);
    })) {
      throw new Error("invalid_day_plan");
    }
    if (findDayPlanConflicts(items, dayPlanFixedEvents).length > 0) {
      throw new Error("conflicting_day_plan");
    }

    const updated: EventRow[] = [];
    try {
      for (const event of candidates) {
        updated.push(await updateCalendarEvent({
          userId: user.id,
          eventId: event.id,
          title: event.title,
          date: event.date,
          timeOfDay: draftsById.get(event.id)!.timeOfDay,
          durationMinutes: draftsById.get(event.id)!.durationMinutes,
          location: event.location,
          travelBufferMinutes: event.travelBufferMinutes,
          notes: event.notes,
          category: event.category,
          personId: event.personId,
          personName: event.personName,
          isImportant: event.isImportant,
          recurrenceRule: event.recurrenceRule,
        }));
      }
      mergeEvents(updated);
      setDayPlanDate(null);
      push({ type: "success", msg: t("dayPlan.saved") });
    } catch (error) {
      // Best-effort compensation keeps this multi-row confirmation from
      // leaving a half-applied draft if a later owner-scoped update fails.
      await Promise.allSettled(updated.map((event) => {
        const original = candidates.find((candidate) => candidate.id === event.id)!;
        return updateCalendarEvent({
        userId: user.id,
        eventId: event.id,
        title: event.title,
        date: event.date,
        timeOfDay: null,
        durationMinutes: original.durationMinutes,
        location: original.location,
        travelBufferMinutes: original.travelBufferMinutes,
        notes: event.notes,
        category: event.category,
        personId: event.personId,
        personName: event.personName,
        isImportant: event.isImportant,
        recurrenceRule: event.recurrenceRule,
        });
      }));
      const refreshed = await listCalendarEvents(user.id).catch(() => null);
      if (refreshed) setEvents(refreshed);
      throw error;
    }
  };

  const persistPlannerPreferences = async (preferences: PlannerPreferences) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/login");
      throw new Error("authentication_required");
    }
    const saved = await savePlannerPreferences(user.id, preferences);
    setPlannerPreferences(saved);
  };

  const createEvent = async () => {
    if (!mTitle.trim() || !mDate) {
      push({ type: "error", msg: t("validation.required") });
      return;
    }
    if (mDurationMinutes && !isValidEventDuration(Number(mDurationMinutes))) {
      push({ type: "error", msg: t("validation.duration") });
      return;
    }
    if (mLocation.trim().length > 300) {
      push({ type: "error", msg: t("validation.location") });
      return;
    }
    if (mTravelBufferMinutes && !isValidTravelBuffer(Number(mTravelBufferMinutes))) {
      push({ type: "error", msg: t("validation.travelBuffer") });
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    try {
      const created = await createCalendarEvent({
        userId: user.id,
        title: mTitle.trim(),
        date: mDate,
        timeOfDay: mTimeOfDay || null,
        durationMinutes: mDurationMinutes ? Number(mDurationMinutes) : null,
        location: mLocation.trim() || null,
        travelBufferMinutes: mTravelBufferMinutes ? Number(mTravelBufferMinutes) : null,
        notes: mNotes.trim() || null,
        category: mCat,
        personId: mPersonId || null,
        personName: people.find((person) => person.id === mPersonId)?.name ?? null,
        isImportant: mIsImportant,
        recurrenceRule: mCat === "birthday" ? "none" : mRecurrenceRule,
      });
      mergeEvents([created]);
      try {
        await reconcileCalendarEventReminder({
          eventId: created.id,
          occurrenceDate: created.date,
          enabled: created.isImportant,
          recurrenceRule: created.recurrenceRule,
        });
      } catch {
        push({ type: "error", msg: t("toast.reminderError") });
      }
      push({ type: "success", msg: t("toast.added") });
      setAddOpen(false);
    } catch {
      push({ type: "error", msg: t("toast.addError") });
    }
  };

  const openEdit = useCallback(
    (id: string) => {
      if (id.startsWith("birthday-")) return;
      const occurrence = allEvents.find((event) => event.id === id);
      const ev = events.find((event) => event.id === (occurrence?.sourceEventId ?? id));
      if (!ev) return;
      setEId(ev.id);
      setETitle(ev.title);
      setEDate(ev.date);
      setETimeOfDay(ev.timeOfDay ?? "");
      setEDurationMinutes(ev.durationMinutes ? String(ev.durationMinutes) : "");
      setELocation(ev.location ?? "");
      setETravelBufferMinutes(ev.travelBufferMinutes ? String(ev.travelBufferMinutes) : "");
      setENotes(ev.notes ?? "");
      setECat(ev.category ?? "personal");
      setEPersonId(ev.personId ?? "");
      setEIsImportant(ev.isImportant);
      setERecurrenceRule(ev.recurrenceRule);
      setEditOpen(true);
    },
    [allEvents, events]
  );

  const saveEdit = async () => {
    const snap = {
      id: eId,
      title: eTitle.trim(),
      date: eDate,
      timeOfDay: eTimeOfDay || null,
      durationMinutes: eDurationMinutes ? Number(eDurationMinutes) : null,
      location: eLocation.trim() || null,
      travelBufferMinutes: eTravelBufferMinutes ? Number(eTravelBufferMinutes) : null,
      notes: eNotes.trim() || null,
      category: eCat || null,
      personId: ePersonId || null,
      personName: people.find((person) => person.id === ePersonId)?.name ?? null,
      isImportant: eIsImportant,
      recurrenceRule: eCat === "birthday" ? "none" : eRecurrenceRule,
    };
    if (!snap.title || !snap.date) {
      push({ type: "error", msg: t("validation.required") });
      return;
    }
    if (snap.durationMinutes !== null && !isValidEventDuration(snap.durationMinutes)) {
      push({ type: "error", msg: t("validation.duration") });
      return;
    }
    if (snap.location !== null && snap.location.length > 300) {
      push({ type: "error", msg: t("validation.location") });
      return;
    }
    if (snap.travelBufferMinutes !== null && !isValidTravelBuffer(snap.travelBufferMinutes)) {
      push({ type: "error", msg: t("validation.travelBuffer") });
      return;
    }
    setConfirm({
      open: true,
      type: "update",
      title: t("confirm.saveTitle"),
      description: `„${snap.title}" — ${formatDateShort(snap.date, locale)}`,
      confirmText: t("common.save"),
      onConfirm: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.replace("/auth/login");
        try {
          const updated = await updateCalendarEvent({
            userId: user.id,
            eventId: snap.id,
            title: snap.title,
            date: snap.date,
            timeOfDay: snap.timeOfDay,
            durationMinutes: snap.durationMinutes,
            location: snap.location,
            travelBufferMinutes: snap.travelBufferMinutes,
            notes: snap.notes,
            category: snap.category,
            personId: snap.personId,
            personName: snap.personName,
            isImportant: snap.isImportant,
            recurrenceRule: snap.recurrenceRule,
          });
          mergeEvents([updated]);
          try {
            await reconcileCalendarEventReminder({
              eventId: updated.id,
              occurrenceDate: updated.date,
              enabled: updated.isImportant,
              recurrenceRule: updated.recurrenceRule,
            });
          } catch {
            push({ type: "error", msg: t("toast.reminderError") });
          }
          push({ type: "success", msg: t("toast.updated") });
          setEditOpen(false);
        } catch {
          push({ type: "error", msg: t("toast.saveError") });
        }
      },
    });
  };

  const doDelete = useCallback(
    (ev: EventRow) => {
      if (ev.id.startsWith("birthday-")) return;
      setConfirm({
        open: true,
        type: "delete",
        title: t("confirm.deleteTitle"),
        description: `„${ev.title}"`,
        confirmText: t("form.delete"),
        onConfirm: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return router.replace("/auth/login");
          try {
            await deleteCalendarEvent(user.id, ev.id);
            setEvents((current) => current.filter((event) => event.id !== ev.id));
            push({ type: "success", msg: t("toast.deleted") });
          } catch {
            push({ type: "error", msg: t("toast.deleteError") });
          }
        },
      });
    },
    [push, router, t]
  );

  const handleSelectDate = useCallback((dateYMD: string) => {
    setSelectedDate((prev) => (prev === dateYMD ? null : dateYMD));
  }, []);

  /* Export ICS */
  const exportICS = () => {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//HappyDate//PL",
      "CALSCALE:GREGORIAN",
    ];
    allEvents.forEach((e) => {
      const dt = e.date.replaceAll("-", "");
      lines.push(
        "BEGIN:VEVENT",
        `UID:${e.id}@happydate`,
        `DTSTAMP:${toUTCStamp(new Date())}`,
        e.timeOfDay
          ? `DTSTART:${dt}T${e.timeOfDay.replace(":", "")}00`
          : `DTSTART;VALUE=DATE:${dt}`,
        e.timeOfDay ? "" : `DTEND;VALUE=DATE:${addOneDayICS(dt)}`,
        e.timeOfDay && e.durationMinutes ? `DURATION:PT${e.durationMinutes}M` : "",
        e.location ? `LOCATION:${escICS(e.location)}` : "",
        e.travelBufferMinutes ? `X-HAPPYDATE-TRAVEL-BUFFER:${e.travelBufferMinutes}` : "",
        `SUMMARY:${escICS(e.title)}`,
        e.notes ? `DESCRIPTION:${escICS(e.notes)}` : "",
        "END:VEVENT"
      );
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.filter(Boolean).join("\r\n") + "\r\n"], {
      type: "text/calendar;charset=utf-8",
    });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: "happydate.ics",
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importICS = async (file: File) => {
    try {
      const text = await file.text();
      const blocks = text.split("BEGIN:VEVENT").slice(1);
      const items = blocks.flatMap((raw) => {
        const get = (re: RegExp) => raw.match(re)?.[1]?.trim();
        const dt = get(/DTSTART(?:;[^:]+)?:([0-9]{8})/);
        const time = get(/DTSTART(?:;[^:]+)?:[0-9]{8}T([0-9]{4})/);
        const duration = get(/DURATION:PT([0-9]+)M/i);
        const travelBuffer = get(/X-HAPPYDATE-TRAVEL-BUFFER:([0-9]+)/i);
        const t = get(/SUMMARY:(.+)/);
        if (!dt || !t) return [];
        return [
          {
            title: t,
          date: `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`,
          timeOfDay: time ? `${time.slice(0, 2)}:${time.slice(2, 4)}` : null,
          durationMinutes: duration && Number(duration) >= 5 && Number(duration) <= 1440 ? Number(duration) : null,
            location: get(/LOCATION:(.+)/)?.slice(0, 300) ?? null,
            travelBufferMinutes: travelBuffer && isValidTravelBuffer(Number(travelBuffer)) ? Number(travelBuffer) : null,
            notes: get(/DESCRIPTION:(.+)/) ?? null,
          },
        ];
      });
      if (!items.length) {
        push({ type: "error", msg: t("toast.noImportEvents") });
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      try {
        const imported = await importCalendarEvents(
          user.id,
          items.map((item) => ({ ...item, category: "personal" })),
        );
        mergeEvents(imported);
        push({
          type: "success",
          msg: t("toast.imported", { count: items.length }),
        });
      } catch {
        push({ type: "error", msg: t("toast.importError") });
      }
    } catch {
      push({ type: "error", msg: t("toast.fileError") });
    }
  };

  /* ═══════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @keyframes sheetUp    { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
        @keyframes fadeInFull { from { opacity:0; } to { opacity:1; } }
        @keyframes stripIn    { from { opacity:0; transform:translateX(8px); } to { opacity:1; transform:none; } }
        @keyframes toastIn    { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:none; } }
        .scrollbar-hide::-webkit-scrollbar { display:none; }
        .scrollbar-hide { -ms-overflow-style:none; scrollbar-width:none; }
        .hd-calendar-page {
          position: relative; overflow: hidden;
          background:
            radial-gradient(430px 260px at 5% -50px, rgba(14,165,233,.14), transparent 72%),
            radial-gradient(360px 230px at 105% 210px, rgba(236,72,153,.055), transparent 74%),
            var(--hd-canvas);
        }
        .hd-calendar-toolbar { padding: 22px 16px 13px; }
        .hd-calendar-purpose {
          display: flex; align-items: center; gap: 11px; margin: 0 12px 12px; padding: 12px 14px;
          border: 1px solid rgba(186,230,253,.72); border-radius: 18px;
          background: linear-gradient(145deg,rgba(240,249,255,.96),rgba(255,251,252,.95));
          box-shadow: 0 10px 30px rgba(15,23,42,.045);
        }
        .hd-calendar-purpose__heart { display: grid; width: 34px; height: 34px; flex: 0 0 34px; place-items: center; border-radius: 12px; background: #fff; color: #ec4899; font-size: 16px; box-shadow: 0 7px 18px rgba(236,72,153,.1); }
        .hd-calendar-purpose__eyebrow { color: #0284c7; font-size: 9px; font-weight: 900; letter-spacing: .11em; text-transform: uppercase; }
        .hd-calendar-purpose__text { margin-top: 2px; color: #475569; font-size: 12px; font-weight: 650; line-height: 1.45; }
        .hd-calendar-icon-button {
          display: grid; width: 46px; height: 46px; place-items: center;
          border: 1px solid rgba(226,232,240,.9); border-radius: 15px;
          background: rgba(255,255,255,.9); box-shadow: var(--hd-shadow-soft);
        }
        .hd-calendar-add {
          border-color: transparent; color: #fff;
          background: linear-gradient(145deg,var(--hd-brand),var(--hd-brand-strong));
          box-shadow: 0 10px 24px rgba(2,132,199,.24);
        }
        .hd-calendar-month { flex-direction: column; gap: 1px; min-height: 46px; justify-content: center; }
        .hd-calendar-month-main { display: flex; align-items: baseline; gap: 6px; }
        .hd-calendar-month-hint { color: var(--hd-brand-strong); font-size: 10px; font-weight: 800; letter-spacing: .04em; }
        .hd-calendar-surface {
          margin: 0 12px; padding: 8px 8px 12px; border: 1px solid rgba(255,255,255,.9);
          border-radius: 24px; background: rgba(255,255,255,.94);
          box-shadow: 0 18px 48px rgba(15,23,42,.075);
        }
        .hd-calendar-month-nav { padding: 0 4px 4px; }
        .hd-calendar-month-nav button {
          width: 42px; height: 42px; border: 1px solid #eef2f7;
          border-radius: 14px; background: #f8fafc; color: #475569; font-size: 21px;
        }
        .hd-calendar-grid { padding: 0; }
        .hd-calendar-legend {
          display: flex; gap: 11px; margin: 12px 4px 0; padding-top: 11px;
          overflow-x: auto; border-top: 1px solid #eef2f7; scrollbar-width: none;
        }
        .hd-calendar-legend::-webkit-scrollbar { display: none; }
        .hd-calendar-legend span { display: inline-flex; align-items: center; gap: 5px; flex: 0 0 auto; color: #64748b; font-size: 10px; font-weight: 750; }
        .hd-calendar-legend i { width: 7px; height: 7px; border-radius: 999px; }
        .hd-calendar-upcoming { margin: 14px 12px 0; padding: 14px; border-radius: 20px; background: rgba(255,255,255,.82); }
        .hd-calendar-utils { margin-top: 14px; }
        @media (min-width: 640px) {
          .hd-calendar-surface, .hd-calendar-upcoming { margin-inline: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hd-calendar-page *, .hd-calendar-page *::before, .hd-calendar-page *::after { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/*
        FIX 1: min-h-[100dvh] — dynamic viewport height avoids the iOS Safari
        address-bar-collapse bug that causes content to overflow or shift.
        w-full instead of implicit 100% ensures correct width on all breakpoints.
      */}
      <div className="hd-calendar-page mx-auto flex min-h-[100dvh] w-full max-w-[var(--hd-screen-wide)] flex-col pb-[calc(var(--hd-nav-height)+env(safe-area-inset-bottom))]">
        <ToastStack items={toasts} />

        {/* ── TOP BAR ── */}
        <div className="hd-calendar-toolbar flex items-center justify-between pt-[calc(env(safe-area-inset-top)+22px)]">
          <button
            onClick={() => setShowSearch(true)}
            className="hd-calendar-icon-button text-slate-500 transition-colors text-lg"
            aria-label={t("search.label")}
          >
            🔍
          </button>

          <button onClick={goToday} className="hd-calendar-month flex items-center group" aria-label={t("navigation.today")}>
            <span className="hd-calendar-month-main">
            <span className="text-xl font-black tracking-[-.035em] text-slate-950 group-hover:text-sky-600 transition-colors">
              {new Intl.DateTimeFormat(locale, { month: "long" }).format(
                new Date(viewYear, viewMonth, 1)
              )}
            </span>
            <span className="text-lg font-extrabold text-slate-400 group-hover:text-sky-500 transition-colors">
              {viewYear}
            </span>
            </span>
            <span className="hd-calendar-month-hint">{t("navigation.today")}</span>
          </button>

          <div className="flex items-center gap-1">
            <input
              ref={fileRef}
              type="file"
              accept=".ics,text/calendar"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importICS(f);
                e.currentTarget.value = "";
              }}
            />
            <button
              onClick={() => openAdd()}
              className="hd-calendar-icon-button hd-calendar-add font-bold text-xl transition-all active:scale-[.93]"
              aria-label={t("navigation.addEvent")}
            >
              ＋
            </button>
          </div>
        </div>

        <section className="hd-calendar-purpose" aria-labelledby="calendar-purpose-title">
          <span className="hd-calendar-purpose__heart" aria-hidden="true">♥</span>
          <div>
            <h1 id="calendar-purpose-title" className="hd-calendar-purpose__eyebrow">{t("purpose.title")}</h1>
            <p className="hd-calendar-purpose__text">{t("purpose.description")}</p>
          </div>
        </section>

        <section className="hd-calendar-surface" aria-label={t("accessibility.calendarLabel", { month: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(viewYear, viewMonth, 1)) })}>
        {/* ── MONTH NAVIGATION ── */}
        <div className="hd-calendar-month-nav flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="flex items-center justify-center transition-colors font-bold"
            aria-label={t("navigation.previousMonth")}
          >
            ‹
          </button>
          <div className="flex-1" />
          <button
            onClick={nextMonth}
            className="flex items-center justify-center transition-colors font-bold"
            aria-label={t("navigation.nextMonth")}
          >
            ›
          </button>
        </div>

        {/* ── CALENDAR GRID ── */}
        <div className="hd-calendar-grid flex-shrink-0">
          {loading ? (
            <div
              role="status"
              aria-label={t("accessibility.loading")}
              className="h-64 rounded-2xl bg-slate-100 animate-pulse mx-1"
            />
          ) : (
            <CalendarGrid
              year={viewYear}
              month={viewMonth}
              events={allEvents}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              onNavigateDate={(dateYMD) => {
                const date = parseLocalDateOnly(dateYMD);
                if (!date) return;
                setViewYear(date.getFullYear());
                setViewMonth(date.getMonth());
                setSelectedDate(dateYMD);
                requestAnimationFrame(() => {
                  document.querySelector<HTMLElement>(`[data-calendar-date="${dateYMD}"]`)?.focus();
                });
              }}
              onPreviousMonth={prevMonth}
              onNextMonth={nextMonth}
            />
          )}
        </div>
        <div className="hd-calendar-legend" aria-label={t("form.importantHint")}>
          <span><i className="bg-pink-400" />{t("categories.birthday")}</span>
          <span><i className="bg-blue-400" />{t("categories.work")}</span>
          <span><i className="bg-emerald-400" />{t("categories.personal")}</span>
          <span><i className="bg-amber-400 ring-2 ring-amber-100" />{t("form.important")}</span>
        </div>
        </section>

        {/* ── UPCOMING STRIP ── */}
        {!loading && upcoming.length > 0 && (
          <div className="hd-calendar-upcoming mb-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              {t("navigation.upcoming")}
            </p>
            <UpcomingStrip
              events={upcoming}
              insights={aiInsights}
              onTap={(dateYMD) => {
                const d = parseLocalDateOnly(dateYMD);
                if (!d) return;
                setViewYear(d.getFullYear());
                setViewMonth(d.getMonth());
                setSelectedDate(dateYMD);
              }}
            />
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!loading && allEvents.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 pb-20">
            <p className="text-5xl mb-4">🌸</p>
            <p className="text-base font-bold text-slate-700 text-center">
              {t("empty.title")}
            </p>
            <p className="text-sm text-slate-400 text-center mt-1 leading-relaxed">
              {t("empty.description")}
            </p>
            <button
              onClick={() => openAdd()}
              className="mt-5 h-11 px-6 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm shadow-md shadow-sky-200 transition-all active:scale-[.97]"
            >
              ＋ {t("empty.action")}
            </button>
          </div>
        )}

        {/* ── BOTTOM UTILS ── */}
        {!loading && (
          <div
            className="hd-calendar-utils flex items-center justify-center gap-4 px-4 pb-4 mt-auto"
            // FIX 6: safe-area-inset-bottom clearance for iPhone home indicator
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium flex items-center gap-1"
            >
              📥 {t("navigation.import")}
            </button>
            <span className="text-slate-200">·</span>
            <button
              onClick={exportICS}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium flex items-center gap-1"
            >
              📤 {t("navigation.export")}
            </button>
            {people.length > 0 && (
              <>
                <span className="text-slate-200">·</span>
                <span className="text-xs text-pink-400 font-medium flex items-center gap-1">
                  🎂 {t("navigation.birthdays", { count: people.length })}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── DAY DETAIL SHEET ── */}
      {selectedDate && !addOpen && !editOpen && (
        <DayDetailSheet
          dateYMD={selectedDate}
          events={selectedDateEvents}
          insights={aiInsights}
          onClose={() => setSelectedDate(null)}
          onAdd={(ymd_) => {
            setSelectedDate(null);
            openAdd(ymd_);
          }}
          onPlan={(ymd_) => {
            setSelectedDate(null);
            setDayPlanDate(ymd_);
          }}
          onEdit={(id) => {
            setSelectedDate(null);
            openEdit(id);
          }}
        />
      )}

      {/* ── ADD SHEET ── */}
      {addOpen && (
        <AddEditSheet
          mode="add"
          date={mDate}
          timeOfDay={mTimeOfDay}
          durationMinutes={mDurationMinutes}
          location={mLocation}
          travelBufferMinutes={mTravelBufferMinutes}
          title={mTitle}
          notes={mNotes}
              category={mCat}
              personId={mPersonId}
              isImportant={mIsImportant}
              recurrenceRule={mRecurrenceRule}
              people={people}
          setDate={setMDate}
          setTimeOfDay={setMTimeOfDay}
          setDurationMinutes={setMDurationMinutes}
          setLocation={setMLocation}
          setTravelBufferMinutes={setMTravelBufferMinutes}
          setTitle={setMTitle}
          setNotes={setMNotes}
              setCategory={setMCat}
              setPersonId={setMPersonId}
              setIsImportant={setMIsImportant}
              setRecurrenceRule={setMRecurrenceRule}
          onCancel={() => setAddOpen(false)}
          onSubmit={createEvent}
        />
      )}

      {/* ── EDIT SHEET ── */}
      {editOpen && (
        <AddEditSheet
          mode="edit"
          date={eDate}
          timeOfDay={eTimeOfDay}
          durationMinutes={eDurationMinutes}
          location={eLocation}
          travelBufferMinutes={eTravelBufferMinutes}
          title={eTitle}
          notes={eNotes}
              category={eCat}
              personId={ePersonId}
              isImportant={eIsImportant}
              recurrenceRule={eRecurrenceRule}
              people={people}
          setDate={setEDate}
          setTimeOfDay={setETimeOfDay}
          setDurationMinutes={setEDurationMinutes}
          setLocation={setELocation}
          setTravelBufferMinutes={setETravelBufferMinutes}
          setTitle={setETitle}
          setNotes={setENotes}
              setCategory={setECat}
              setPersonId={setEPersonId}
              setIsImportant={setEIsImportant}
              setRecurrenceRule={setERecurrenceRule}
          onCancel={() => setEditOpen(false)}
          onSubmit={saveEdit}
          onDelete={() => {
            doDelete({
              id: eId,
              title: eTitle,
              date: eDate,
              timeOfDay: eTimeOfDay || null,
              durationMinutes: eDurationMinutes ? Number(eDurationMinutes) : null,
              location: eLocation.trim() || null,
              travelBufferMinutes: eTravelBufferMinutes ? Number(eTravelBufferMinutes) : null,
              notes: eNotes,
                  category: eCat,
                  personId: ePersonId || null,
                  personName: people.find((person) => person.id === ePersonId)?.name ?? null,
                  isImportant: eIsImportant,
                  recurrenceRule: eRecurrenceRule,
            });
            setEditOpen(false);
          }}
        />
      )}

      {dayPlanDate && (
        <DayPlanSheet
          key={`${dayPlanDate}:${dayPlanEvents.map((event) => event.id).join(":") || "empty"}`}
          dateLabel={new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(parseLocalDateOnly(dayPlanDate) ?? new Date(Number.NaN))}
          events={dayPlanEvents}
          fixedEvents={dayPlanFixedEvents}
          uncertainFixedCount={dayPlanUncertainFixedCount}
          deferredCount={dayPlanCandidates.deferred.length}
          initialPreferences={plannerPreferences}
          onCancel={() => setDayPlanDate(null)}
          onSave={saveDayPlan}
          onSavePreferences={persistPlannerPreferences}
        />
      )}

      {/* ── SEARCH OVERLAY ── */}
      {showSearch && (
        <SearchOverlay
          events={allEvents}
          insights={aiInsights}
          onClose={() => setShowSearch(false)}
          onEdit={(id) => {
            setShowSearch(false);
            openEdit(id);
          }}
        />
      )}

      <ConfirmDialog
        state={confirm}
        onClose={() => setConfirm({ open: false })}
      />
    </>
  );
}
