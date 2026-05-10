"use client";

import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { EventRow } from "@/components/EventsCalendar";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import Link from "next/link";

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */

type PersonRow = {
  id: string;
  name: string;
  birthday: string | null;
  notes?: string | null;
};

/* ═══════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════ */

const CAT_COLOR: Record<string, { dot: string; pill: string; text: string }> = {
  birthday: { dot: "bg-pink-400",    pill: "bg-pink-50 border-pink-200",    text: "text-pink-700" },
  work:     { dot: "bg-blue-400",    pill: "bg-blue-50 border-blue-200",    text: "text-blue-700" },
  personal: { dot: "bg-emerald-400", pill: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
  default:  { dot: "bg-slate-400",   pill: "bg-slate-50 border-slate-200",  text: "text-slate-600" },
};

const CAT_EMOJI: Record<string, string> = {
  birthday: "🎂",
  work:     "💼",
  personal: "⭐",
  default:  "📌",
};

const MONTHS_PL = [
  "Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec",
  "Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień",
];
const DAYS_PL_SHORT = ["Pn","Wt","Śr","Cz","Pt","Sb","Nd"];

const AI_TOPICS: Array<[RegExp, string]> = [
  [/kawa|coffee/i,           "☕ lubi kawę"],
  [/podróż|travel|wyjazd/i,  "✈️ lubi podróże"],
  [/książk|czyta/i,          "📚 lubi czytać"],
  [/zegar|watch/i,           "⌚ kolekcjonuje zegarki"],
  [/foto|aparat|fuji/i,      "📷 pasjonuje się fotografią"],
  [/muzyk|gitara|piano/i,    "🎵 lubi muzykę"],
  [/sport|siłown|bieg/i,     "🏃 jest aktywny sportowo"],
  [/wellness|spa|relaks/i,   "🧘 ceni chwile relaksu"],
  [/gier|gaming|game/i,      "🎮 gra w gry"],
  [/gotow|kulinarn/i,        "👨‍🍳 lubi gotować"],
];

/* ═══════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════ */

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function todayYMD(): string {
  return ymd(new Date());
}

function daysLeft(dateYMD: string): number {
  const today = new Date(); today.setHours(0,0,0,0);
  const dt    = new Date(dateYMD + "T00:00:00");
  return Math.round((dt.getTime() - today.getTime()) / 86400000);
}

function daysLabel(dateYMD: string): string {
  const d = daysLeft(dateYMD);
  if (d === 0) return "Dziś 🎉";
  if (d === 1) return "Jutro";
  if (d < 0)  return `${Math.abs(d)} dni temu`;
  return `Za ${d} dni`;
}

function urgencyBadge(dateYMD: string): string {
  const d = daysLeft(dateYMD);
  if (d <= 0)  return "bg-rose-50 text-rose-600 border-rose-200";
  if (d <= 3)  return "bg-orange-50 text-orange-600 border-orange-200";
  if (d <= 7)  return "bg-amber-50 text-amber-700 border-amber-200";
  if (d <= 14) return "bg-sky-50 text-sky-600 border-sky-200";
  return "bg-slate-50 text-slate-500 border-slate-200";
}

function formatDateShort(dateYMD: string): string {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric", month: "short",
  }).format(new Date(dateYMD + "T00:00:00"));
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
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

function getAIInsight(person: PersonRow): string | null {
  if (!person.notes) return null;
  for (const [re, label] of AI_TOPICS) {
    if (re.test(person.notes)) return label;
  }
  return null;
}

/* ICS */
function toUTCStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth()+1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}
function addOneDayICS(dt: string): string {
  const d = new Date(Date.UTC(+dt.slice(0,4), +dt.slice(4,6)-1, +dt.slice(6,8)));
  d.setUTCDate(d.getUTCDate() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth()+1)}${p(d.getUTCDate())}`;
}
function escICS(s: string): string {
  return s.replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");
}

/* ═══════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════ */
type Toast = { id: number; type: "success"|"error"; msg: string };

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast,"id">) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, ...t }]);
    setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 3200);
  }, []);
  return { toasts, push };
}

function ToastStack({ items }: { items: Toast[] }) {
  if (!items.length) return null;
  return (
    <div className="fixed top-safe-top top-4 right-4 z-[500] flex flex-col gap-2 pointer-events-none">
      {items.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium shadow-lg border pointer-events-auto backdrop-blur-xl ${
            t.type === "success"
              ? "bg-white/90 border-emerald-200 text-emerald-800"
              : "bg-white/90 border-red-200 text-red-700"
          }`}
          style={{ animation: "toastIn .25s cubic-bezier(.34,1.56,.64,1) both" }}
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
    const sel = () => Array.from(el.querySelectorAll<HTMLElement>(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    )).filter(n => !n.hasAttribute("disabled"));
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
  | { open: true; type: "delete"|"update"; title: string; description?: string; confirmText?: string; onConfirm: () => Promise<void>|void };

function ConfirmDialog({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const ref = useFocusTrap(state.open);
  if (!state.open) return null;
  const { title, description, confirmText = "Potwierdź", onConfirm, type } = state;
  const danger = type === "delete";

  const handleOk = async () => {
    try { setBusy(true); await onConfirm(); }
    finally { setBusy(false); onClose(); }
  };

  return (
    <div
      className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-4"
      role="alertdialog" aria-modal="true"
      onKeyDown={e => e.key === "Escape" && onClose()}
    >
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[3px]" onClick={onClose} />
      <div
        ref={ref}
        className="relative bg-white/96 backdrop-blur-2xl w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-white/50"
        style={{ animation: "sheetUp .28s cubic-bezier(.34,1.56,.64,1) both" }}
      >
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${danger ? "bg-red-100" : "bg-emerald-100"}`}>
          <span className="text-xl">{danger ? "🗑️" : "💾"}</span>
        </div>
        <p className="font-bold text-slate-900 text-base mb-1">{title}</p>
        {description && <p className="text-sm text-slate-500 mb-4 leading-relaxed">{description}</p>}
        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose} disabled={busy}
            className="flex-1 h-11 rounded-2xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={handleOk} disabled={busy}
            className={`flex-1 h-11 rounded-2xl text-sm font-bold transition-all active:scale-[.98] ${
              danger ? "bg-red-500 hover:bg-red-600 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white"
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
═══════════════════════════════════════════════════ */
const CATEGORIES_ADD = [
  { value: "birthday", label: "Urodziny", emoji: "🎂" },
  { value: "work",     label: "Praca",    emoji: "💼" },
  { value: "personal", label: "Osobiste", emoji: "⭐" },
] as const;

function AddEditSheet({
  mode, date, title, notes, category,
  setDate, setTitle, setNotes, setCategory,
  onCancel, onSubmit, onDelete,
}: {
  mode: "add"|"edit";
  date: string; title: string; notes: string; category: string;
  setDate: (v: string) => void; setTitle: (v: string) => void;
  setNotes: (v: string) => void; setCategory: (v: string) => void;
  onCancel: () => void; onSubmit: () => void; onDelete?: () => void;
}) {
  const ref = useFocusTrap(true);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 60); }, []);

  return (
    <div
      role="dialog" aria-modal="true"
      className="fixed inset-0 z-[350] flex items-end justify-center"
      onKeyDown={e => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
          e.preventDefault(); onSubmit();
        }
      }}
    >
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[3px]" onClick={onCancel} />
      <div
        ref={ref}
        className="relative bg-white w-full max-w-lg rounded-t-[2rem] shadow-2xl overflow-hidden border-t border-white/40"
        style={{ animation: "sheetUp .3s cubic-bezier(.34,1.56,.64,1) both" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-[3px] rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-slate-100">
          <button onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors px-1">
            Anuluj
          </button>
          <p className="text-sm font-bold text-slate-800">
            {mode === "add" ? "Nowe wydarzenie" : "Edytuj wydarzenie"}
          </p>
          <button
            onClick={onSubmit}
            disabled={!title || !date}
            className="text-sm font-bold text-sky-500 hover:text-sky-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-1"
          >
            {mode === "add" ? "Dodaj" : "Zapisz"}
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-4 space-y-4">
          {/* Title */}
          <div className="flex items-center gap-3 py-2 border-b border-slate-100">
            <span className="text-slate-300 text-lg select-none">✏️</span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Tytuł wydarzenia"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="flex-1 text-base text-slate-900 placeholder-slate-300 outline-none bg-transparent font-medium"
            />
          </div>

          {/* Date */}
          <div className="flex items-center gap-3 py-2 border-b border-slate-100">
            <span className="text-slate-300 text-lg select-none">📅</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="flex-1 text-sm text-slate-700 outline-none bg-transparent"
            />
          </div>

          {/* Category */}
          <div className="flex items-center gap-3 py-2 border-b border-slate-100">
            <span className="text-slate-300 text-lg select-none">🏷️</span>
            <div className="flex gap-2 flex-1">
              {CATEGORIES_ADD.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-[.97] ${
                    category === c.value
                      ? CAT_COLOR[c.value].pill + " " + CAT_COLOR[c.value].text + " shadow-sm"
                      : "border-slate-200 text-slate-400 bg-white"
                  }`}
                >
                  <span>{c.emoji}</span> {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="flex items-center gap-3 py-2">
            <span className="text-slate-300 text-lg select-none">📝</span>
            <input
              type="text"
              placeholder="Notatka (opcjonalnie)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="flex-1 text-sm text-slate-700 placeholder-slate-300 outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Delete */}
        {mode === "edit" && onDelete && (
          <div className="px-5 pb-6 border-t border-slate-100 pt-4">
            <button
              onClick={onDelete}
              className="w-full h-11 rounded-2xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              🗑️ Usuń wydarzenie
            </button>
          </div>
        )}

        {!mode || mode === "add" ? <div className="h-6" /> : null}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   DAY DETAIL SHEET
═══════════════════════════════════════════════════ */
function DayDetailSheet({
  dateYMD,
  events,
  insights,
  onClose,
  onAdd,
  onEdit,
}: {
  dateYMD: string;
  events: EventRow[];
  insights: Map<string, string>;
  onClose: () => void;
  onAdd: (ymd: string) => void;
  onEdit: (id: string) => void;
}) {
  const ref = useFocusTrap(true);
  const today = todayYMD();
  const isToday = dateYMD === today;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center"
      onKeyDown={e => e.key === "Escape" && onClose()}
    >
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={ref}
        className="relative bg-white w-full max-w-lg rounded-t-[2rem] shadow-2xl border-t border-white/40"
        style={{ animation: "sheetUp .28s cubic-bezier(.34,1.56,.64,1) both" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3">
          <div className="w-9 h-[3px] rounded-full bg-slate-200" />
        </div>

        {/* Date header */}
        <div className="px-5 pt-3 pb-3 flex items-end justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              {new Intl.DateTimeFormat("pl-PL", { weekday: "long" }).format(new Date(dateYMD + "T00:00:00"))}
            </p>
            <h3 className="text-xl font-extrabold text-slate-900 leading-tight flex items-center gap-2">
              {new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long" }).format(new Date(dateYMD + "T00:00:00"))}
              {isToday && (
                <span className="text-xs font-bold bg-sky-500 text-white px-2 py-0.5 rounded-full">Dziś</span>
              )}
            </h3>
          </div>
          <button
            onClick={() => onAdd(dateYMD)}
            className="h-9 px-4 rounded-2xl bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 transition-colors shadow-sm shadow-sky-200 flex items-center gap-1.5"
          >
            <span className="text-base leading-none">＋</span> Dodaj
          </button>
        </div>

        {/* Events */}
        <div className="px-4 pb-8 max-h-[55vh] overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">🌙</p>
              <p className="text-sm text-slate-400">Brak wydarzeń</p>
              <button
                onClick={() => onAdd(dateYMD)}
                className="mt-3 text-xs text-sky-500 font-semibold hover:text-sky-700 transition-colors"
              >
                + Dodaj pierwsze
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {events.map(ev => {
                const isBirthday = ev.id.startsWith("birthday-");
                const cat = ev.category ?? "default";
                const colors = CAT_COLOR[cat] ?? CAT_COLOR.default;
                const insight = insights.get(ev.id);
                const cleanTitle = ev.title.replace(/^🎂\s*/, "");

                return (
                  <li
                    key={ev.id}
                    className={`rounded-2xl border p-3.5 transition-all ${
                      !isBirthday ? "cursor-pointer hover:shadow-sm active:scale-[.99]" : ""
                    } ${colors.pill}`}
                    onClick={() => !isBirthday && onEdit(ev.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                        isBirthday ? "bg-pink-100 text-pink-600" : avatarClass(cleanTitle)
                      }`}>
                        {isBirthday ? "🎂" : getInitials(cleanTitle)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 justify-between">
                          <p className={`font-bold text-sm leading-tight ${colors.text}`}>
                            {cleanTitle}
                          </p>
                          {isBirthday && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-500 border border-purple-200 font-bold shrink-0">
                              auto
                            </span>
                          )}
                        </div>

                        {ev.notes && !isBirthday && (
                          <p className="text-xs text-slate-400 mt-0.5 leading-snug">{ev.notes}</p>
                        )}

                        {/* AI insight */}
                        {insight && (
                          <p className="text-[11px] text-violet-500 mt-1.5 font-medium flex items-center gap-1">
                            <span>✨</span> {insight}
                          </p>
                        )}
                      </div>

                      {/* Gift link */}
                      {!isBirthday && (
                        <Link
                          href={`/gift/start?eventId=${ev.id}&date=${encodeURIComponent(ev.date)}&title=${encodeURIComponent(ev.title)}`}
                          onClick={e => e.stopPropagation()}
                          className="w-8 h-8 rounded-xl bg-white/70 border border-white flex items-center justify-center text-sm hover:bg-white transition-colors shrink-0"
                          title="Pomysł na prezent"
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
  if (!events.length) return null;

  return (
    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
      <div className="flex gap-2 pb-0.5" style={{ width: "max-content" }}>
        {events.map((ev, i) => {
          const cat    = ev.category ?? "default";
          const colors = CAT_COLOR[cat] ?? CAT_COLOR.default;
          const diff   = daysLeft(ev.date);
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
                <p className={`text-xs font-bold leading-tight truncate max-w-[100px] ${isToday ? "text-white" : colors.text}`}>
                  {cleanName}
                </p>
                <p className={`text-[10px] font-semibold ${isToday ? "text-white/80" : "text-slate-400"}`}>
                  {diff === 0 ? "Dziś 🎉" : diff === 1 ? "Jutro" : `Za ${diff} dni`}
                </p>
                {insight && !isToday && (
                  <p className="text-[9px] text-violet-400 mt-0.5 font-medium">✨ {insight.slice(0, 20)}</p>
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
  year, month,
  events,
  selectedDate,
  onSelectDate,
}: {
  year: number;
  month: number;
  events: EventRow[];
  selectedDate: string | null;
  onSelectDate: (ymd: string) => void;
}) {
  const today = todayYMD();

  const firstDay = new Date(year, month, 1);
  /* Monday-first: getDay() returns 0=Sun…6=Sat, remap */
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  /* Map date → events */
  const eventMap = useMemo(() => {
    const m = new Map<string, EventRow[]>();
    events.forEach(ev => {
      const key = ev.date.slice(0, 7);
      const ym = `${year}-${String(month+1).padStart(2,"0")}`;
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
    <div className="w-full">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_PL_SHORT.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;

          const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isToday    = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const dayEvents  = eventMap.get(dateStr) ?? [];

          /* Collect up to 3 unique category dots */
          const dots = [...new Set(dayEvents.map(e => e.category ?? "default"))].slice(0, 3);

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`relative flex flex-col items-center justify-start py-1.5 rounded-xl transition-all active:scale-[.92] min-h-[52px] ${
                isSelected
                  ? "bg-sky-500 shadow-md shadow-sky-200"
                  : isToday
                  ? "bg-sky-50 ring-1 ring-sky-200"
                  : "hover:bg-slate-50"
              }`}
            >
              <span className={`text-sm font-bold leading-none ${
                isSelected
                  ? "text-white"
                  : isToday
                  ? "text-sky-600"
                  : "text-slate-800"
              }`}>
                {day}
              </span>

              {/* Event dots */}
              {dots.length > 0 && (
                <div className="flex gap-0.5 mt-1.5 items-center">
                  {dots.map((cat, di) => (
                    <span
                      key={di}
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? "bg-white/80" : (CAT_COLOR[cat]?.dot ?? CAT_COLOR.default.dot)
                      }`}
                    />
                  ))}
                </div>
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
  const [q, setQ] = useState("");
  const inputRef  = useRef<HTMLInputElement>(null);
  const ref       = useFocusTrap(true);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const results = useMemo(() => {
    const lower = q.trim().toLowerCase();
    if (!lower) return [];
    return events.filter(ev =>
      `${ev.title} ${ev.notes ?? ""}`.toLowerCase().includes(lower)
    ).slice(0, 20);
  }, [events, q]);

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[400] flex flex-col bg-white"
      style={{ animation: "fadeInFull .2s ease both" }}
      onKeyDown={e => e.key === "Escape" && onClose()}
    >
      {/* Search bar */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-3 border-b border-slate-100">
        <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-2xl px-3 h-10">
          <span className="text-slate-400 text-sm">🔍</span>
          <input
            ref={inputRef}
            type="search"
            placeholder="Szukaj wydarzeń, osób, notatek…"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="flex-1 text-sm text-slate-900 bg-transparent outline-none placeholder-slate-400"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-slate-400 text-xs font-bold hover:text-slate-600">✕</button>
          )}
        </div>
        <button onClick={onClose} className="text-sm font-medium text-sky-500 hover:text-sky-700 transition-colors whitespace-nowrap">
          Anuluj
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!q.trim() ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm text-slate-400">Zacznij pisać, aby szukać</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🌸</p>
            <p className="text-sm text-slate-400">Brak wyników dla &bdquo;{q}&ldquo;</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {results.map(ev => {
              const isBirthday = ev.id.startsWith("birthday-");
              const cat    = ev.category ?? "default";
              const colors = CAT_COLOR[cat] ?? CAT_COLOR.default;
              const cleanTitle = ev.title.replace(/^🎂\s*/, "");
              const insight = insights.get(ev.id);

              return (
                <li
                  key={ev.id}
                  className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => { if (!isBirthday) { onEdit(ev.id); onClose(); } }}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${colors.pill} ${colors.text} font-bold border`}>
                    {CAT_EMOJI[cat] ?? "📌"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm leading-tight">{cleanTitle}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-400">{formatDateShort(ev.date)}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${urgencyBadge(ev.date)}`}>
                        {daysLabel(ev.date)}
                      </span>
                    </div>
                    {insight && (
                      <p className="text-[11px] text-violet-500 mt-1">✨ {insight}</p>
                    )}
                    {ev.notes && !isBirthday && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{ev.notes}</p>
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

  /* ── State ── */
  const [events,  setEvents]  = useState<EventRow[]>([]);
  const [people,  setPeople]  = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);

  const currentYear = useRef(new Date().getFullYear()).current;
  const [viewYear,  setViewYear]  = useState(currentYear);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showSearch,   setShowSearch]   = useState(false);

  /* Add / edit */
  const [addOpen, setAddOpen]   = useState(false);
  const [mDate,   setMDate]     = useState("");
  const [mTitle,  setMTitle]    = useState("");
  const [mNotes,  setMNotes]    = useState("");
  const [mCat,    setMCat]      = useState("personal");

  const [editOpen, setEditOpen] = useState(false);
  const [eId,   setEId]         = useState("");
  const [eTitle, setETitle]     = useState("");
  const [eDate,  setEDate]      = useState("");
  const [eNotes, setENotes]     = useState("");
  const [eCat,   setECat]       = useState("personal");

  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const { toasts, push } = useToasts();
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Init + realtime ── */
  useEffect(() => {
    let ch: RealtimeChannel | null = null;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login"); return; }

      const [{ data: evData, error: evErr }, { data: peopleData }] = await Promise.all([
        supabase.from("events")
          .select("id,user_id,title,date,notes,category")
          .eq("user_id", user.id)
          .order("date", { ascending: true }),
        supabase.from("people")
          .select("id,name,birthday,notes")
          .eq("user_id", user.id)
          .not("birthday", "is", null),
      ]);

      if (evErr) push({ type: "error", msg: "Nie udało się pobrać wydarzeń." });
      if (!evErr && evData) setEvents(evData as EventRow[]);
      if (peopleData) setPeople(peopleData as PersonRow[]);
      setLoading(false);

      ch = supabase.channel("cal-ch")
        .on("postgres_changes",
          { event: "*", schema: "public", table: "events", filter: `user_id=eq.${user.id}` },
          (payload: RealtimePostgresChangesPayload<EventRow>) => {
            const sort = (arr: EventRow[]) => [...arr].sort((a,b) => a.date.localeCompare(b.date));
            if (payload.eventType === "INSERT")
              setEvents(p => sort([...p, payload.new as EventRow]));
            if (payload.eventType === "UPDATE")
              setEvents(p => sort(p.map(e => e.id === (payload.new as EventRow).id ? payload.new as EventRow : e)));
            if (payload.eventType === "DELETE")
              setEvents(p => p.filter(e => e.id !== (payload.old as EventRow).id));
          }
        ).subscribe();
    };
    init();
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [router, push]);

  /* ── Birthday events ── */
  const birthdayEvents = useMemo<EventRow[]>(() => {
    return people
      .filter(p => !!p.birthday)
      .map(p => {
        const bd  = new Date(p.birthday! + "T00:00:00");
        const mon = String(bd.getMonth()+1).padStart(2,"0");
        const day = String(bd.getDate()).padStart(2,"0");
        return {
          id:       `birthday-${p.id}`,
          title:    `🎂 ${p.name}`,
          date:     `${currentYear}-${mon}-${day}`,
          notes:    null,
          category: "birthday",
        };
      });
  }, [people, currentYear]);

  /* ── All events merged ── */
  const allEvents = useMemo<EventRow[]>(() => {
    const existingIds = new Set(events.map(e => e.id));
    const unique = birthdayEvents.filter(b => !existingIds.has(b.id));
    return [...events, ...unique].sort((a,b) => a.date.localeCompare(b.date));
  }, [events, birthdayEvents]);

  /* ── AI Insights ── */
  const aiInsights = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    people.forEach(p => {
      const insight = getAIInsight(p);
      if (insight) map.set(`birthday-${p.id}`, `${p.name} ${insight}`);
    });
    events.forEach(ev => {
      if (ev.notes && ev.notes.length > 8) {
        const d = daysLeft(ev.date);
        if (d > 0 && d <= 14)
          map.set(ev.id, `Notatka: ${ev.notes.slice(0, 45)}${ev.notes.length > 45 ? "…" : ""}`);
      }
    });
    return map;
  }, [people, events]);

  /* ── Upcoming 30 days ── */
  const upcoming = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const in30  = new Date(today); in30.setDate(today.getDate()+30);
    return allEvents
      .filter(e => { const d = new Date(e.date+"T00:00:00"); return d >= today && d <= in30; })
      .slice(0, 12);
  }, [allEvents]);

  /* ── Events for selected date ── */
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return allEvents.filter(e => e.date === selectedDate);
  }, [allEvents, selectedDate]);

  /* ── Navigation ── */
  const prevMonth = useCallback(() => {
    setViewMonth(m => {
      if (m === 0) { setViewYear(y => y-1); return 11; }
      return m - 1;
    });
  }, []);
  const nextMonth = useCallback(() => {
    setViewMonth(m => {
      if (m === 11) { setViewYear(y => y+1); return 0; }
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
  const openAdd = useCallback((ymd_?: string) => {
    const d = ymd_ ?? todayYMD();
    setMDate(d); setMTitle(""); setMNotes(""); setMCat("personal"); setAddOpen(true);
  }, []);

  const createEvent = async () => {
    if (!mTitle.trim() || !mDate) { push({ type: "error", msg: "Uzupełnij tytuł i datę." }); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/auth/login"); return; }
    const { error } = await supabase.from("events").insert([
      { user_id: user.id, title: mTitle.trim(), date: mDate, notes: mNotes.trim()||null, category: mCat }
    ]);
    if (error) push({ type: "error", msg: "Nie udało się dodać." });
    else push({ type: "success", msg: "Dodano wydarzenie 🎉" });
    setAddOpen(false);
  };

  const openEdit = useCallback((id: string) => {
    if (id.startsWith("birthday-")) return;
    const ev = events.find(e => e.id === id);
    if (!ev) return;
    setEId(ev.id); setETitle(ev.title); setEDate(ev.date);
    setENotes(ev.notes ?? ""); setECat(ev.category ?? "personal");
    setEditOpen(true);
  }, [events]);

  const saveEdit = async () => {
    const snap = { id: eId, title: eTitle.trim(), date: eDate, notes: eNotes.trim()||null, category: eCat||null };
    if (!snap.title || !snap.date) { push({ type: "error", msg: "Uzupełnij tytuł i datę." }); return; }
    setConfirm({
      open: true, type: "update",
      title: "Zapisać zmiany?",
      description: `„${snap.title}" — ${formatDateShort(snap.date)}`,
      confirmText: "Zapisz",
      onConfirm: async () => {
        const { error } = await supabase.from("events").update(snap).eq("id", snap.id);
        if (error) push({ type: "error", msg: "Nie udało się zapisać." });
        else push({ type: "success", msg: "Zaktualizowano ✅" });
        setEditOpen(false);
      },
    });
  };

  const doDelete = useCallback((ev: EventRow) => {
    if (ev.id.startsWith("birthday-")) return;
    setConfirm({
      open: true, type: "delete",
      title: "Usunąć wydarzenie?",
      description: `„${ev.title}"`,
      confirmText: "Usuń",
      onConfirm: async () => {
        const { error } = await supabase.from("events").delete().eq("id", ev.id);
        if (error) push({ type: "error", msg: "Nie udało się usunąć." });
        else push({ type: "success", msg: "Usunięto 🗑️" });
      },
    });
  }, [push]);

  const handleSelectDate = useCallback((dateYMD: string) => {
    setSelectedDate(prev => prev === dateYMD ? null : dateYMD);
  }, []);

  /* Export ICS */
  const exportICS = () => {
    const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//HappyDate//PL","CALSCALE:GREGORIAN"];
    allEvents.forEach(e => {
      const dt = e.date.replaceAll("-","");
      lines.push("BEGIN:VEVENT",`UID:${e.id}@happydate`,`DTSTAMP:${toUTCStamp(new Date())}`,
        `DTSTART;VALUE=DATE:${dt}`,`DTEND;VALUE=DATE:${addOneDayICS(dt)}`,
        `SUMMARY:${escICS(e.title)}`,e.notes ? `DESCRIPTION:${escICS(e.notes)}` : "","END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.filter(Boolean).join("\r\n")+"\r\n"], { type:"text/calendar;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "happydate.ics" });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const importICS = async (file: File) => {
    try {
      const text = await file.text();
      const blocks = text.split("BEGIN:VEVENT").slice(1);
      const items = blocks.flatMap(raw => {
        const get = (re: RegExp) => raw.match(re)?.[1]?.trim();
        const dt = get(/DTSTART(?:;[^:]+)?:([0-9]{8})/);
        const t  = get(/SUMMARY:(.+)/);
        if (!dt || !t) return [];
        return [{ title: t, date: `${dt.slice(0,4)}-${dt.slice(4,6)}-${dt.slice(6,8)}`, notes: get(/DESCRIPTION:(.+)/) ?? null }];
      });
      if (!items.length) { push({ type: "error", msg: "Nie znaleziono wydarzeń." }); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login"); return; }
      const { error } = await supabase.from("events").insert(
        items.map(i => ({ user_id: user.id, ...i, category: "personal" }))
      );
      if (error) push({ type: "error", msg: "Import nie powiódł się." });
      else push({ type: "success", msg: `Zaimportowano ${items.length} wydarzeń 📥` });
    } catch { push({ type: "error", msg: "Błąd odczytu pliku." }); }
  };

  /* ═══════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @keyframes sheetUp   { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
        @keyframes fadeInFull{ from { opacity:0; } to { opacity:1; } }
        @keyframes stripIn   { from { opacity:0; transform:translateX(8px); } to { opacity:1; transform:none; } }
        @keyframes toastIn   { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:none; } }
        .scrollbar-hide::-webkit-scrollbar { display:none; }
        .scrollbar-hide { -ms-overflow-style:none; scrollbar-width:none; }
      `}</style>

      <div className="min-h-screen bg-white flex flex-col max-w-lg mx-auto">
        <ToastStack items={toasts} />

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between px-4 pt-12 pb-2">
          <button
            onClick={() => setShowSearch(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors text-lg"
            aria-label="Szukaj"
          >
            🔍
          </button>

          {/* Month / year — tappable to go today */}
          <button onClick={goToday} className="flex items-center gap-1.5 group">
            <span className="text-base font-extrabold text-slate-900 group-hover:text-sky-600 transition-colors">
              {MONTHS_PL[viewMonth]}
            </span>
            <span className="text-base font-extrabold text-slate-400 group-hover:text-sky-500 transition-colors">
              {viewYear}
            </span>
          </button>

          <div className="flex items-center gap-1">
            {/* Import/Export hidden inputs */}
            <input
              ref={fileRef} type="file" accept=".ics,text/calendar" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if(f) importICS(f); e.currentTarget.value=""; }}
            />
            <button
              onClick={() => openAdd()}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-500 hover:bg-sky-600 text-white font-bold text-lg shadow-sm shadow-sky-200 transition-all active:scale-[.93]"
              aria-label="Dodaj wydarzenie"
            >
              ＋
            </button>
          </div>
        </div>

        {/* ── MONTH NAVIGATION ── */}
        <div className="flex items-center justify-between px-4 pb-2">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors text-sm font-bold"
            aria-label="Poprzedni miesiąc"
          >
            ‹
          </button>

          <div className="flex-1" />

          <button
            onClick={nextMonth}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors text-sm font-bold"
            aria-label="Następny miesiąc"
          >
            ›
          </button>
        </div>

        {/* ── CALENDAR GRID ── */}
        <div className="px-3 flex-shrink-0">
          {loading ? (
            <div className="h-64 rounded-2xl bg-slate-100 animate-pulse mx-1" />
          ) : (
            <CalendarGrid
              year={viewYear}
              month={viewMonth}
              events={allEvents}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
            />
          )}
        </div>

        {/* ── DIVIDER ── */}
        <div className="mx-4 my-3 border-t border-slate-100" />

        {/* ── UPCOMING STRIP ── */}
        {!loading && upcoming.length > 0 && (
          <div className="px-4 mb-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Nadchodzące · 30 dni
            </p>
            <UpcomingStrip
              events={upcoming}
              insights={aiInsights}
              onTap={dateYMD => {
                /* Navigate to that month and open day sheet */
                const d = new Date(dateYMD + "T00:00:00");
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
            <p className="text-base font-bold text-slate-700 text-center">Brak wydarzeń</p>
            <p className="text-sm text-slate-400 text-center mt-1 leading-relaxed">
              Dodaj pierwsze wydarzenie, aby zobaczyć je w kalendarzu.
            </p>
            <button
              onClick={() => openAdd()}
              className="mt-5 h-11 px-6 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm shadow-md shadow-sky-200 transition-all active:scale-[.97]"
            >
              ＋ Dodaj wydarzenie
            </button>
          </div>
        )}

        {/* ── BOTTOM UTILS (slim) ── */}
        {!loading && (
          <div className="flex items-center justify-center gap-4 px-4 pb-4 mt-auto">
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium flex items-center gap-1"
            >
              📥 Import
            </button>
            <span className="text-slate-200">·</span>
            <button
              onClick={exportICS}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium flex items-center gap-1"
            >
              📤 Export .ics
            </button>
            {people.length > 0 && (
              <>
                <span className="text-slate-200">·</span>
                <span className="text-xs text-pink-400 font-medium flex items-center gap-1">
                  🎂 {people.length} {people.length === 1 ? "urodziny" : "urodzin"}
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
          onAdd={ymd_ => { setSelectedDate(null); openAdd(ymd_); }}
          onEdit={id => { setSelectedDate(null); openEdit(id); }}
        />
      )}

      {/* ── ADD SHEET ── */}
      {addOpen && (
        <AddEditSheet
          mode="add"
          date={mDate} title={mTitle} notes={mNotes} category={mCat}
          setDate={setMDate} setTitle={setMTitle} setNotes={setMNotes} setCategory={setMCat}
          onCancel={() => setAddOpen(false)} onSubmit={createEvent}
        />
      )}

      {/* ── EDIT SHEET ── */}
      {editOpen && (
        <AddEditSheet
          mode="edit"
          date={eDate} title={eTitle} notes={eNotes} category={eCat}
          setDate={setEDate} setTitle={setETitle} setNotes={setENotes} setCategory={setECat}
          onCancel={() => setEditOpen(false)} onSubmit={saveEdit}
          onDelete={() => {
            doDelete({ id: eId, title: eTitle, date: eDate, notes: eNotes, category: eCat });
            setEditOpen(false);
          }}
        />
      )}

      {/* ── SEARCH OVERLAY ── */}
      {showSearch && (
        <SearchOverlay
          events={allEvents}
          insights={aiInsights}
          onClose={() => setShowSearch(false)}
          onEdit={id => { setShowSearch(false); openEdit(id); }}
        />
      )}

      <ConfirmDialog state={confirm} onClose={() => setConfirm({ open: false })} />
    </>
  );
}