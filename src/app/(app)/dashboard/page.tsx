"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import EventsCalendar, { type EventRow } from "@/components/EventsCalendar";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import Link from "next/link";

/* ═══════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════ */

const CATEGORIES = [
  { value: "all",      label: "Wszystkie", emoji: "✨" },
  { value: "birthday", label: "Urodziny",  emoji: "🎂" },
  { value: "work",     label: "Praca",     emoji: "💼" },
  { value: "personal", label: "Osobiste",  emoji: "⭐" },
] as const;

const BADGE: Record<string, string> = {
  birthday: "bg-pink-50 text-pink-700 border border-pink-200",
  work:     "bg-amber-50 text-amber-800 border border-amber-200",
  personal: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  default:  "bg-slate-50 text-slate-600 border border-slate-200",
};
const BADGE_DOT: Record<string, string> = {
  birthday: "bg-pink-400",
  work:     "bg-amber-400",
  personal: "bg-emerald-400",
  default:  "bg-slate-400",
};

const CAT_EMOJI: Record<string, string> = {
  birthday: "🎂",
  work:     "💼",
  personal: "⭐",
  default:  "📌",
};

/* ═══════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════ */

const labelKat = (cat?: string | null) =>
  cat === "birthday" ? "Urodziny"
  : cat === "work"   ? "Praca"
  : cat === "personal" ? "Osobiste"
  : "Inne";

const formatPL = (ymd: string) =>
  new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(
    new Date(ymd + "T00:00:00")
  );

const formatPLShort = (ymd: string) =>
  new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" }).format(
    new Date(ymd + "T00:00:00")
  );

const monthShortPL = new Intl.DateTimeFormat("pl-PL", { month: "short" });
function dayBadgeParts(ymd: string) {
  const d = new Date(ymd + "T00:00:00");
  return {
    day: d.getDate().toString().padStart(2, "0"),
    mon: monthShortPL.format(d).toUpperCase(),
  };
}

function daysLeft(ymd: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dt    = new Date(ymd + "T00:00:00");
  return Math.round((dt.getTime() - today.getTime()) / 86400000);
}

function daysLeftLabel(ymd: string) {
  const diff = daysLeft(ymd);
  if (diff === 0) return "Dziś 🎉";
  if (diff === 1) return "Jutro";
  if (diff < 0)  return `${Math.abs(diff)} dni temu`;
  return `Za ${diff} dni`;
}

function urgencyColor(ymd: string) {
  const diff = daysLeft(ymd);
  if (diff <= 0)  return "text-rose-600 bg-rose-50 border-rose-200";
  if (diff <= 3)  return "text-orange-600 bg-orange-50 border-orange-200";
  if (diff <= 7)  return "text-amber-700 bg-amber-50 border-amber-200";
  if (diff <= 14) return "text-sky-600 bg-sky-50 border-sky-200";
  return "text-slate-500 bg-slate-50 border-slate-200";
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-pink-100 text-pink-700",
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

function avatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

/* ICS helpers */
function toUTCStamp(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth()+1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}
function addOneDay(dt: string) {
  const d = new Date(Date.UTC(+dt.slice(0,4), +dt.slice(4,6)-1, +dt.slice(6,8)));
  d.setUTCDate(d.getUTCDate() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth()+1)}${p(d.getUTCDate())}`;
}
function escICS(s: string) {
  return s.replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");
}

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */

type PersonRow = {
  id: string;
  name: string;
  birthday: string | null;
  notes?: string | null;
};

type AIInsight = {
  id: string;
  eventId: string;
  text: string;
  type: "gift" | "note" | "memory" | "countdown";
};

/* ═══════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════ */
type Toast = { id: number; type: "success" | "error"; msg: string };

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, ...t }]);
    setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 3500);
  }, []);
  return { toasts, push };
}

function ToastStack({ items }: { items: Toast[] }) {
  return (
    <div className="fixed top-5 right-4 z-[400] flex flex-col gap-2 pointer-events-none">
      {items.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium backdrop-blur-sm pointer-events-auto transition-all ${
            t.type === "success"
              ? "bg-emerald-50/95 border-emerald-200 text-emerald-800"
              : "bg-red-50/95 border-red-200 text-red-800"
          }`}
          style={{ animation: "slideInRight .25s cubic-bezier(.34,1.56,.64,1) both" }}
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
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    const foc = () =>
      Array.from(el.querySelectorAll<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      )).filter(n => !n.hasAttribute("disabled"));
    foc()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = foc();
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

function ConfirmDialog({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const trapRef = useFocusTrap(state.open);
  if (!state.open) return null;
  const { title, description, confirmText = "Potwierdź", onConfirm, type } = state;
  const danger = type === "delete";

  const handleOk = async () => {
    try { setBusy(true); await onConfirm(); }
    finally { setBusy(false); onClose(); }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4"
      role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle"
      onKeyDown={e => e.key === "Escape" && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" onClick={onClose} />
      <div
        ref={trapRef}
        className="relative bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-white/60"
        style={{ animation: "popIn .22s cubic-bezier(.34,1.56,.64,1) both" }}
      >
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${danger ? "bg-red-100" : "bg-emerald-100"}`}>
          <span className="text-xl">{danger ? "🗑️" : "💾"}</span>
        </div>
        <h3 id="confirmTitle" className="text-base font-bold text-slate-900 mb-1">{title}</h3>
        {description && <p className="text-sm text-slate-500 mb-5">{description}</p>}
        <div className="flex gap-2 mt-5">
          <button
            className="flex-1 border border-slate-200 rounded-2xl h-11 text-sm font-medium hover:bg-slate-50 transition-colors"
            onClick={onClose} disabled={busy}
          >
            Anuluj
          </button>
          <button
            className={`flex-1 h-11 rounded-2xl text-sm font-bold transition-all active:scale-[.98] ${
              danger
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-emerald-500 hover:bg-emerald-600 text-white"
            }`}
            onClick={handleOk} disabled={busy}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ADD / EDIT MODAL
═══════════════════════════════════════════════════ */
function AddEditModal({
  mode, date, title, notes, category,
  setDate, setTitle, setNotes, setCategory,
  onCancel, onSubmit, onDelete,
}: {
  mode: "add" | "edit";
  date: string; title: string; notes: string; category: string;
  setDate: (v: string) => void; setTitle: (v: string) => void;
  setNotes: (v: string) => void; setCategory: (v: string) => void;
  onCancel: () => void; onSubmit: () => void; onDelete?: () => void;
}) {
  const trapRef = useFocusTrap(true);
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => titleRef.current?.focus(), 50); }, []);

  const cats = CATEGORIES.filter(c => c.value !== "all");

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="ae-title"
      className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center"
      onKeyDown={e => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
          e.preventDefault(); onSubmit();
        }
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" onClick={onCancel} />
      <div
        ref={trapRef}
        className="relative bg-white/95 backdrop-blur-xl w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-white/60 overflow-hidden"
        style={{ animation: "slideUp .3s cubic-bezier(.34,1.56,.64,1) both" }}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className={`px-6 pt-5 pb-4 ${
          mode === "add"
            ? "bg-gradient-to-r from-sky-50 via-cyan-50 to-teal-50"
            : "bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-sm ${
                mode === "add" ? "bg-sky-100" : "bg-violet-100"
              }`}>
                {mode === "add" ? "✨" : "✏️"}
              </div>
              <div>
                <h3 id="ae-title" className="font-bold text-slate-900 text-base leading-tight">
                  {mode === "add" ? "Nowe wydarzenie" : "Edytuj wydarzenie"}
                </h3>
                {date && (
                  <p className="text-xs text-slate-500 mt-0.5">{formatPL(date)}</p>
                )}
              </div>
            </div>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all text-sm font-bold"
              aria-label="Zamknij"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
              Tytuł *
            </label>
            <input
              ref={titleRef}
              type="text"
              placeholder="np. Urodziny Mamy"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-2xl px-4 h-11 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition-shadow bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
              Data *
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-2xl px-4 h-11 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300 transition-shadow bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
              Kategoria
            </label>
            <div className="grid grid-cols-3 gap-2">
              {cats.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`h-10 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all active:scale-[.97] ${
                    category === c.value
                      ? BADGE[c.value] + " shadow-sm scale-[1.02]"
                      : "border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-base">{c.emoji}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
              Notatka
            </label>
            <input
              type="text"
              placeholder="Opcjonalnie…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-slate-200 rounded-2xl px-4 h-11 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 transition-shadow bg-slate-50/50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          {mode === "edit" && onDelete ? (
            <button
              onClick={onDelete}
              className="h-11 px-4 rounded-2xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-1.5"
            >
              🗑️ Usuń
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="h-11 px-5 rounded-2xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Anuluj
            </button>
            <button
              onClick={onSubmit}
              disabled={!title || !date}
              className="h-11 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white text-sm font-bold shadow-md shadow-sky-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[.98]"
            >
              {mode === "add" ? "Dodaj ✨" : "Zapisz ✅"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   DAY PREVIEW SHEET (compact tap → sheet → modal flow)
═══════════════════════════════════════════════════ */
function DayPreviewSheet({
  date,
  events,
  onClose,
  onAddEvent,
  onOpenEvent,
}: {
  date: string;
  events: EventRow[];
  onClose: () => void;
  onAddEvent: (ymd: string) => void;
  onOpenEvent: (id: string) => void;
}) {
  const trapRef = useFocusTrap(true);

  return (
    <div
      className="fixed inset-0 z-[210] flex items-end justify-center"
      onKeyDown={e => e.key === "Escape" && onClose()}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={trapRef}
        className="relative bg-white/95 backdrop-blur-xl w-full max-w-lg rounded-t-[2rem] shadow-2xl border border-white/60 overflow-hidden"
        style={{ animation: "slideUp .3s cubic-bezier(.34,1.56,.64,1) both" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              {new Intl.DateTimeFormat("pl-PL", { weekday: "long" }).format(new Date(date + "T00:00:00"))}
            </p>
            <h3 className="text-lg font-extrabold text-slate-900">{formatPL(date)}</h3>
          </div>
          <button
            onClick={() => onAddEvent(date)}
            className="h-9 px-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 text-xs font-bold hover:bg-sky-100 transition-colors"
          >
            + Dodaj
          </button>
        </div>

        <div className="px-5 pb-6 pt-2 max-h-80 overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-3xl mb-2">🌸</p>
              <p className="text-sm text-slate-400">Brak wydarzeń w tym dniu</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {events.map(ev => {
                const isBirthday = ev.id.startsWith("birthday-");
                return (
                  <li
                    key={ev.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group"
                    onClick={() => !isBirthday && onOpenEvent(ev.id)}
                  >
                    <span className="text-xl">{CAT_EMOJI[ev.category ?? "default"] ?? "📌"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{ev.title}</p>
                      {ev.notes && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{ev.notes}</p>
                      )}
                    </div>
                    {!isBirthday && (
                      <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
                    )}
                    {isBirthday && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-500 border border-purple-200 font-semibold shrink-0">
                        auto
                      </span>
                    )}
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
   AI INSIGHT CARD (lightweight + contextual)
═══════════════════════════════════════════════════ */
function AIInsightCard({ insights }: { insights: AIInsight[] }) {
  const [idx, setIdx] = useState(0);
  const displayed = insights.slice(0, 3);

  useEffect(() => {
    if (displayed.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % displayed.length), 5000);
    return () => clearInterval(t);
  }, [displayed.length]);

  if (!displayed.length) return null;
  const current = displayed[idx];

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 px-5 py-4"
      style={{ animation: "fadeIn .4s ease both" }}
    >
      {/* Decorative orb */}
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-violet-100/60 blur-xl pointer-events-none" />

      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-2xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0 text-base">
          ✨
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-0.5">
            AI sugestia
          </p>
          <p
            key={idx}
            className="text-sm font-medium text-violet-900 leading-snug"
            style={{ animation: "fadeIn .35s ease both" }}
          >
            {current.text}
          </p>
        </div>
      </div>

      {displayed.length > 1 && (
        <div className="flex items-center gap-1 mt-3 pl-11">
          {displayed.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1 rounded-full transition-all ${
                i === idx ? "w-5 bg-violet-400" : "w-1.5 bg-violet-200"
              }`}
              aria-label={`Wskazówka ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   HERO EVENT CARD
═══════════════════════════════════════════════════ */
function HeroEventCard({
  event,
  insight,
  onEdit,
}: {
  event: EventRow;
  insight?: string;
  onEdit: () => void;
}) {
  const diff = daysLeft(event.date);

  return (
    <div
      className="relative overflow-hidden rounded-3xl text-white"
      style={{
        background: "linear-gradient(135deg, #ec4899 0%, #f43f5e 40%, #fb923c 100%)",
        animation: "slideDown .4s cubic-bezier(.34,1.56,.64,1) both",
      }}
    >
      {/* Pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 20% 80%, white 1px, transparent 1px)",
          backgroundSize: "20px 20px, 32px 32px",
        }}
      />
      {/* Blurred blob */}
      <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />

      <div className="relative px-5 pt-5 pb-4">
        <div className="flex items-start gap-3">
          {/* Avatar / emoji */}
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shrink-0 border border-white/30">
            {event.id.startsWith("birthday-") ? "🎂" : CAT_EMOJI[event.category ?? "default"] ?? "📌"}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-75 mb-0.5">
              Najbliższe wydarzenie
            </p>
            <h2 className="text-xl font-extrabold leading-tight truncate">{event.title}</h2>
            <p className="text-sm opacity-80 mt-0.5">{formatPLShort(event.date)}</p>
          </div>

          {/* Countdown badge */}
          <div className="shrink-0 flex flex-col items-center justify-center bg-white/20 backdrop-blur rounded-2xl px-3 py-2 border border-white/30 min-w-[56px]">
            {diff === 0 ? (
              <span className="text-lg">🎉</span>
            ) : diff > 0 ? (
              <>
                <span className="text-2xl font-black leading-none">{diff}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-80 font-semibold">
                  {diff === 1 ? "dzień" : "dni"}
                </span>
              </>
            ) : (
              <span className="text-xs font-bold opacity-80">Minęło</span>
            )}
          </div>
        </div>

        {/* AI insight inside hero */}
        {insight && (
          <div className="mt-3 px-3 py-2.5 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
            <p className="text-[11px] opacity-75 font-semibold mb-0.5">✨ AI przypomina:</p>
            <p className="text-sm font-medium leading-snug">{insight}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {!event.id.startsWith("birthday-") && (
            <button
              onClick={onEdit}
              className="flex-1 h-9 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur text-sm font-semibold border border-white/20 transition-all active:scale-[.97]"
            >
              ✏️ Edytuj
            </button>
          )}
          <Link
            href={`/gift/start?eventId=${event.id}&date=${encodeURIComponent(event.date)}&title=${encodeURIComponent(event.title)}`}
            className="flex-1 h-9 rounded-2xl bg-white/25 hover:bg-white/35 backdrop-blur text-sm font-bold border border-white/30 flex items-center justify-center gap-1.5 transition-all active:scale-[.97]"
          >
            🎁 Prezent
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   UPCOMING EMOTIONAL FEED
═══════════════════════════════════════════════════ */
function UpcomingFeed({
  events,
  insights,
  onEdit,
}: {
  events: EventRow[];
  insights: Map<string, string>;
  onEdit: (id: string) => void;
}) {
  if (!events.length) return null;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
            🎁 Nadchodzące
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Najbliższe 30 dni</p>
        </div>
        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
          {events.length}
        </span>
      </div>

      <ul className="px-3 pb-4 space-y-2">
        {events.map((ev, i) => {
          const isBirthday = ev.id.startsWith("birthday-");
          const insight = insights.get(ev.id);
          const title = ev.title.replace(/^🎂\s*/, "");
          const initials = getInitials(title.split(" ").slice(0, 2).join(" "));
          const avColor = avatarColor(title);

          return (
            <li
              key={ev.id}
              className="group relative rounded-2xl overflow-hidden border border-slate-100 hover:border-slate-200 transition-all"
              style={{ animation: `fadeIn .3s ease ${i * 0.05}s both` }}
            >
              <div className="flex items-start gap-3 p-3">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold shrink-0 ${avColor}`}>
                  {isBirthday ? "🎂" : initials}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-slate-800 leading-tight">
                      {title}
                    </p>
                    {isBirthday && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-500 border border-purple-200 font-bold">
                        auto
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[11px] text-slate-400">{formatPLShort(ev.date)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgencyColor(ev.date)}`}>
                      {daysLeftLabel(ev.date)}
                    </span>
                  </div>

                  {/* AI insight */}
                  {insight && (
                    <div className="mt-2 flex items-start gap-1.5">
                      <span className="text-violet-400 text-xs shrink-0 mt-px">✨</span>
                      <p className="text-[11px] text-violet-600 leading-snug font-medium">{insight}</p>
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                  {!isBirthday && (
                    <>
                      <Link
                        href={`/gift/start?eventId=${ev.id}&date=${encodeURIComponent(ev.date)}&title=${encodeURIComponent(ev.title)}`}
                        className="w-7 h-7 rounded-xl flex items-center justify-center bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-sm transition-colors"
                        title="Pomysł na prezent"
                      >
                        🎁
                      </Link>
                      <button
                        onClick={() => onEdit(ev.id)}
                        className="w-7 h-7 rounded-xl flex items-center justify-center bg-sky-50 border border-sky-200 hover:bg-sky-100 text-sm transition-colors"
                        title="Edytuj"
                      >
                        ✏️
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   EVENTS LIST
═══════════════════════════════════════════════════ */
function EventsList({
  events,
  loading,
  onEdit,
  onDelete,
  onClearFilters,
}: {
  events: EventRow[];
  loading: boolean;
  onEdit: (id: string) => void;
  onDelete: (ev: EventRow) => void;
  onClearFilters: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const MAX = 5;
  const visible = showAll ? events : events.slice(0, MAX);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
          📋 Wszystkie wydarzenia
        </h2>
        <span className="text-xs text-slate-400 font-medium">{events.length} łącznie</span>
      </div>

      {loading ? (
        <div className="px-5 pb-5 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="px-5 pb-8 text-center">
          <p className="text-4xl mb-2">🌸</p>
          <p className="text-slate-500 text-sm">Brak wyników dla wybranych filtrów.</p>
          <button
            onClick={onClearFilters}
            className="mt-3 text-xs text-sky-500 hover:text-sky-700 font-medium transition-colors"
          >
            Wyczyść filtry
          </button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-50">
            {visible.map((ev, i) => {
              const { day, mon } = dayBadgeParts(ev.date);
              const isBirthday = ev.id.startsWith("birthday-");
              return (
                <li
                  key={ev.id}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors group"
                  style={{ animation: `fadeIn .25s ease ${i * 0.04}s both` }}
                >
                  {/* Date badge */}
                  <div className="flex flex-col items-center justify-center w-11 h-11 rounded-2xl bg-slate-50 border border-slate-100 shrink-0 group-hover:border-slate-200 transition-colors">
                    <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider leading-none">{mon}</span>
                    <span className="text-lg font-extrabold text-slate-800 leading-none">{day}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm truncate">{ev.title}</p>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${BADGE[ev.category ?? "default"] ?? BADGE.default}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${BADGE_DOT[ev.category ?? "default"] ?? BADGE_DOT.default}`} />
                        {labelKat(ev.category)}
                      </span>
                      {isBirthday && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-500 border border-purple-200 font-bold">
                          auto
                        </span>
                      )}
                    </div>
                    {ev.notes && !isBirthday && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{ev.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  {!isBirthday && (
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                      <Link
                        href={`/gift/start?eventId=${ev.id}&date=${encodeURIComponent(ev.date)}&title=${encodeURIComponent(ev.title)}`}
                        className="w-7 h-7 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-xs transition-colors"
                        title="Pomysł na prezent"
                      >
                        🎁
                      </Link>
                      <button
                        onClick={() => onEdit(ev.id)}
                        className="w-7 h-7 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 flex items-center justify-center text-xs transition-colors"
                        title="Edytuj"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDelete(ev)}
                        className="w-7 h-7 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 flex items-center justify-center text-xs transition-colors"
                        title="Usuń"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {events.length > MAX && (
            <div className="px-5 py-3 border-t border-slate-50">
              <button
                onClick={() => setShowAll(v => !v)}
                className="w-full h-10 rounded-2xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors font-medium"
              >
                {showAll
                  ? "Pokaż mniej ↑"
                  : `Pokaż wszystkie (${events.length - MAX} więcej) ↓`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════ */
export default function DashboardPage() {
  const router  = useRouter();
  const [email,   setEmail]   = useState<string | null>(null);
  const [events,  setEvents]  = useState<EventRow[]>([]);
  const [people,  setPeople]  = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [query,     setQuery]     = useState("");
  const [filterCat, setFilterCat] = useState("all");

  /* Add modal */
  const [addOpen, setAddOpen] = useState(false);
  const [mDate,   setMDate]   = useState("");
  const [mTitle,  setMTitle]  = useState("");
  const [mNotes,  setMNotes]  = useState("");
  const [mCat,    setMCat]    = useState("personal");

  /* Edit modal */
  const [editOpen, setEditOpen] = useState(false);
  const [eId,    setEId]    = useState("");
  const [eTitle, setETitle] = useState("");
  const [eDate,  setEDate]  = useState("");
  const [eNotes, setENotes] = useState("");
  const [eCat,   setECat]   = useState("personal");

  /* Calendar compact */
  const [calExpanded, setCalExpanded] = useState(false);

  /* Day preview sheet */
  const [daySheet, setDaySheet] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const { toasts, push } = useToasts();
  const fileRef = useRef<HTMLInputElement>(null);

  /* Remember last category */
  useEffect(() => {
    try {
      const l = localStorage.getItem("hd:lastCat");
      if (l) { setMCat(l); setECat(l); }
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("hd:lastCat", mCat); } catch {}
  }, [mCat]);

  /* ── Init + realtime ── */
  useEffect(() => {
    let ch: RealtimeChannel | null = null;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login"); return; }
      setEmail(user.email ?? null);

      const [{ data: evData, error: evErr }, { data: peopleData }] = await Promise.all([
        supabase
          .from("events")
          .select("id,user_id,title,date,notes,category")
          .eq("user_id", user.id)
          .order("date", { ascending: true }),
        supabase
          .from("people")
          .select("id, name, birthday, notes")
          .eq("user_id", user.id)
          .not("birthday", "is", null),
      ]);

      if (evErr) push({ type: "error", msg: "Nie udało się pobrać wydarzeń." });
      if (!evErr && evData) setEvents(evData as EventRow[]);
      if (peopleData) setPeople(peopleData as PersonRow[]);

      setLoading(false);

      ch = supabase.channel("ev-ch")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "events", filter: `user_id=eq.${user.id}` },
          (payload: RealtimePostgresChangesPayload<EventRow>) => {
            const sort = (arr: EventRow[]) =>
              [...arr].sort((a, b) => a.date.localeCompare(b.date));
            if (payload.eventType === "INSERT")
              setEvents(p => sort([...p, payload.new as EventRow]));
            if (payload.eventType === "UPDATE")
              setEvents(p => sort(p.map(e => e.id === (payload.new as EventRow).id ? payload.new as EventRow : e)));
            if (payload.eventType === "DELETE")
              setEvents(p => p.filter(e => e.id !== (payload.old as EventRow).id));
          }
        )
        .subscribe();
    };
    init();
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [router, push]);

  /* ── Birthday events from people ── */
  const birthdayEvents = useMemo<EventRow[]>(() => {
    const year = new Date().getFullYear();
    return people
      .filter(p => !!p.birthday)
      .map(p => {
        const bday = new Date(p.birthday! + "T00:00:00");
        const month = String(bday.getMonth() + 1).padStart(2, "0");
        const day   = String(bday.getDate()).padStart(2, "0");
        return {
          id:       `birthday-${p.id}`,
          title:    `🎂 ${p.name}`,
          date:     `${year}-${month}-${day}`,
          notes:    "Urodziny",
          category: "birthday",
        };
      });
  }, [people]);

  /* ── All events ── */
  const allEvents = useMemo<EventRow[]>(() => {
    const existingIds = new Set(events.map(e => e.id));
    const uniqueBirthdays = birthdayEvents.filter(b => !existingIds.has(b.id));
    return [...events, ...uniqueBirthdays].sort((a, b) => a.date.localeCompare(b.date));
  }, [events, birthdayEvents]);

  /* ── AI Insights (derived from notes + people data) ── */
  const aiInsights = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();

    // For birthday events tied to a person with notes
    people.forEach(p => {
      if (!p.birthday || !p.notes) return;
      const id = `birthday-${p.id}`;
      const notesLow = p.notes.toLowerCase();

      const hints: string[] = [];
      if (notesLow.includes("kawa") || notesLow.includes("coffee")) {
        hints.push(`${p.name} często wspomina o kawie ☕`);
      }
      if (notesLow.includes("podróż") || notesLow.includes("travel") || notesLow.includes("wyjazd")) {
        hints.push(`${p.name} lubi podróże ✈️`);
      }
      if (notesLow.includes("książk") || notesLow.includes("czyta")) {
        hints.push(`${p.name} lubi czytać 📚`);
      }
      if (notesLow.includes("zegar") || notesLow.includes("watch")) {
        hints.push(`${p.name} interesuje się zegarkami ⌚`);
      }
      if (notesLow.includes("foto") || notesLow.includes("aparat") || notesLow.includes("fuji")) {
        hints.push(`${p.name} jest pasjonatem fotografii 📷`);
      }
      if (notesLow.includes("muzyk") || notesLow.includes("gitara") || notesLow.includes("piano")) {
        hints.push(`${p.name} lubi muzykę 🎵`);
      }
      if (notesLow.includes("sport") || notesLow.includes("siłown") || notesLow.includes("bieg")) {
        hints.push(`${p.name} jest aktywny sportowo 🏃`);
      }
      if (notesLow.includes("wellness") || notesLow.includes("spa") || notesLow.includes("relaks")) {
        hints.push(`${p.name} ceni chwile relaksu 🧘`);
      }

      if (hints.length > 0) map.set(id, hints[0]);
    });

    // For regular events with notes
    events.forEach(ev => {
      if (ev.notes && ev.notes.length > 10) {
        const diff = daysLeft(ev.date);
        if (diff > 0 && diff <= 14) {
          map.set(ev.id, `Masz notatkę: „${ev.notes.slice(0, 60)}${ev.notes.length > 60 ? "…" : ""}"`);
        }
      }
    });

    return map;
  }, [people, events]);

  /* ── Global AI insight cards ── */
  const globalInsights = useMemo<AIInsight[]>(() => {
    const list: AIInsight[] = [];

    // Upcoming birthdays with no gift note
    allEvents
      .filter(e => e.category === "birthday")
      .forEach(e => {
        const diff = daysLeft(e.date);
        if (diff > 0 && diff <= 14) {
          const name = e.title.replace(/^🎂\s*/, "");
          list.push({
            id: `insight-bday-${e.id}`,
            eventId: e.id,
            type: "countdown",
            text: `Za ${diff} ${diff === 1 ? "dzień" : "dni"} urodziny ${name} — czas na prezent! 🎁`,
          });
        }
      });

    // People with insight notes
    people.forEach(p => {
      const id = `birthday-${p.id}`;
      const insight = aiInsights.get(id);
      if (insight) {
        list.push({ id: `insight-person-${p.id}`, eventId: id, type: "memory", text: insight });
      }
    });

    // Events added recently
    events.slice(-2).forEach(e => {
      if (e.notes && e.notes.length > 5) {
        list.push({
          id: `insight-note-${e.id}`,
          eventId: e.id,
          type: "note",
          text: `Masz notatkę do wydarzenia „${e.title}": ${e.notes.slice(0, 50)}`,
        });
      }
    });

    return list.slice(0, 5);
  }, [allEvents, people, aiInsights, events]);

  /* ── Upcoming (next 30 days) ── */
  const upcoming = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in30  = new Date(today); in30.setDate(today.getDate() + 30);
    return allEvents
      .filter(e => {
        const d = new Date(e.date + "T00:00:00");
        return d >= today && d <= in30;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);
  }, [allEvents]);

  /* ── Filtered events ── */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEvents.filter(e => {
      const okCat = filterCat === "all" || (e.category ?? "default") === filterCat;
      const okQ   = !q || `${e.title} ${e.notes ?? ""}`.toLowerCase().includes(q);
      return okCat && okQ;
    });
  }, [allEvents, query, filterCat]);

  /* ── Events for day sheet ── */
  const daySheetEvents = useMemo(() => {
    if (!daySheet) return [];
    return allEvents.filter(e => e.date === daySheet);
  }, [allEvents, daySheet]);

  /* ── Handlers ── */
  const openAdd = useCallback((ymd?: string) => {
    const d = ymd ?? (() => {
      const t = new Date();
      return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;
    })();
    setMDate(d); setMTitle(""); setMNotes(""); setAddOpen(true);
  }, []);

  const createEvent = async () => {
    if (!mTitle.trim() || !mDate) { push({ type: "error", msg: "Uzupełnij tytuł i datę." }); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/auth/login"); return; }
    const { error } = await supabase.from("events").insert([
      { user_id: user.id, title: mTitle.trim(), date: mDate, notes: mNotes.trim() || null, category: mCat }
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
    const snap = { id: eId, title: eTitle.trim(), date: eDate, notes: eNotes.trim() || null, category: eCat || null };
    if (!snap.title || !snap.date) { push({ type: "error", msg: "Tytuł i data są wymagane." }); return; }
    setConfirm({
      open: true, type: "update",
      title: "Zapisać zmiany?",
      description: `„${snap.title}" — ${formatPL(snap.date)}`,
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
      description: `„${ev.title}" — ${formatPL(ev.date)}`,
      confirmText: "Usuń",
      onConfirm: async () => {
        const { error } = await supabase.from("events").delete().eq("id", ev.id);
        if (error) push({ type: "error", msg: "Nie udało się usunąć." });
        else push({ type: "success", msg: "Usunięto 🗑️" });
      },
    });
  }, [push]);

  /* ── Calendar day click — show preview sheet first ── */
  const handleDayClick = useCallback((dateYMD: string) => {
    setDaySheet(dateYMD);
  }, []);

  /* ── Export / Import ── */
  const exportICS = () => {
    const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//HappyDate//PL","CALSCALE:GREGORIAN"];
    filtered.forEach(e => {
      const dt = e.date.replaceAll("-","");
      lines.push("BEGIN:VEVENT",`UID:${e.id}@happydate`,`DTSTAMP:${toUTCStamp(new Date())}`,
        `DTSTART;VALUE=DATE:${dt}`,`DTEND;VALUE=DATE:${addOneDay(dt)}`,
        `SUMMARY:${escICS(e.title)}`,e.notes ? `DESCRIPTION:${escICS(e.notes)}` : "","END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.filter(Boolean).join("\r\n")+"\r\n"], { type: "text/calendar;charset=utf-8" });
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
      {/* Global animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: none; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
        @keyframes popIn { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: none; } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-rose-50">
        <ToastStack items={toasts} />

        {/* ──────────── PAGE HEADER ──────────── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                🗓️ Moje wydarzenia
              </h1>
              <p className="mt-0.5 text-sm text-slate-400">Twój osobisty kalendarz relacji ✨</p>
              {email && <p className="text-xs text-slate-300 mt-0.5">{email}</p>}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => openAdd()}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white text-sm font-bold shadow-md shadow-sky-200 transition-all active:scale-[.97]"
              >
                <span>＋</span>
                <span className="hidden sm:inline">Dodaj</span>
              </button>
              <input
                ref={fileRef} type="file" accept=".ics,text/calendar" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) importICS(f); e.currentTarget.value = ""; }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="hidden sm:inline-flex items-center gap-1.5 h-10 px-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
              >
                📥
              </button>
              <button
                onClick={exportICS}
                className="hidden sm:inline-flex items-center gap-1.5 h-10 px-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
              >
                📤
              </button>
            </div>
          </div>
        </div>

        {/* ──────────── BIRTHDAY SYNC BANNER ──────────── */}
        {people.length > 0 && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-3">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-pink-50 border border-pink-200 rounded-2xl text-xs text-pink-700 font-medium">
              <span>🎂</span>
              <span>
                Zsynchronizowano <strong>{people.length}</strong> {people.length === 1 ? "urodziny" : "urodzin"} z listy osób
              </span>
            </div>
          </div>
        )}

        {/* ──────────── MAIN GRID ──────────── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* ─── LEFT COLUMN ─── */}
            <div className="lg:col-span-8 space-y-5">

              {/* 1. HERO EVENT CARD */}
              {!loading && upcoming.length > 0 && (
                <HeroEventCard
                  event={upcoming[0]}
                  insight={aiInsights.get(upcoming[0].id)}
                  onEdit={() => openEdit(upcoming[0].id)}
                />
              )}

              {/* 2. AI INSIGHT CARD */}
              {!loading && globalInsights.length > 0 && (
                <AIInsightCard insights={globalInsights} />
              )}

              {/* 3. UPCOMING EMOTIONAL FEED */}
              {!loading && upcoming.length > 1 && (
                <UpcomingFeed
                  events={upcoming.slice(1)}
                  insights={aiInsights}
                  onEdit={openEdit}
                />
              )}

              {/* 4. SEARCH & FILTERS */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm select-none">🔎</span>
                    <input
                      type="search"
                      placeholder="Szukaj wydarzeń, notatek, osób…"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      className="w-full pl-10 pr-4 h-11 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 transition-shadow"
                    />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-hide">
                    {CATEGORIES.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setFilterCat(c.value)}
                        className={`flex-shrink-0 h-11 px-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 border active:scale-[.97] ${
                          filterCat === c.value
                            ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                            : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-sm">{c.emoji}</span>
                        <span className="hidden sm:inline">{c.label}</span>
                      </button>
                    ))}
                    {(query || filterCat !== "all") && (
                      <button
                        onClick={() => { setQuery(""); setFilterCat("all"); }}
                        className="flex-shrink-0 h-11 px-3 rounded-2xl text-xs text-slate-400 hover:text-slate-600 border border-slate-200 hover:border-slate-300 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                {filtered.length > 0 && (query || filterCat !== "all") && (
                  <p className="text-xs text-slate-400 mt-2.5 pl-1">
                    {filtered.length} {filtered.length === 1 ? "wynik" : "wyniki"}
                  </p>
                )}
              </div>

              {/* 5. EVENTS LIST */}
              <EventsList
                events={filtered}
                loading={loading}
                onEdit={openEdit}
                onDelete={doDelete}
                onClearFilters={() => { setQuery(""); setFilterCat("all"); }}
              />

              {/* 6. CALENDAR — compact/expanded */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    📅 Kalendarz
                  </h2>
                  <button
                    onClick={() => setCalExpanded(v => !v)}
                    className="text-xs text-sky-500 hover:text-sky-700 font-semibold transition-colors flex items-center gap-1"
                  >
                    {calExpanded ? "Zwiń ↑" : "Rozwiń ↓"}
                  </button>
                </div>

                {loading ? (
                  <div className="px-5 pb-5">
                    <div className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
                  </div>
                ) : (
                  <div
                    className="px-4 pb-5 overflow-hidden transition-all duration-500"
                    style={{ maxHeight: calExpanded ? "700px" : "320px" }}
                  >
                    <EventsCalendar
                      items={filtered}
                      onDayClick={handleDayClick}
                      onEventClick={openEdit}
                    />
                  </div>
                )}
              </div>

              {/* 7. IMPORT / EXPORT (utility, de-emphasized) */}
              <div className="flex gap-2 sm:hidden">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 h-10 rounded-2xl border border-slate-200 bg-white text-slate-500 text-xs font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  📥 Import .ics
                </button>
                <button
                  onClick={exportICS}
                  className="flex-1 h-10 rounded-2xl border border-slate-200 bg-white text-slate-500 text-xs font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  📤 Export .ics
                </button>
              </div>
            </div>

            {/* ─── RIGHT SIDEBAR ─── */}
            <aside className="lg:col-span-4 space-y-5">
              {/* Add button */}
              <button
                onClick={() => openAdd()}
                className="hidden lg:flex w-full h-12 items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold shadow-md shadow-sky-200 transition-all active:scale-[.98]"
              >
                ＋ Dodaj wydarzenie
              </button>

              {/* Stat cards */}
              {!loading && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Wszystkich", value: allEvents.length, emoji: "📋", color: "bg-sky-50 border-sky-100" },
                    { label: "Nadchodzące", value: upcoming.length, emoji: "🎁", color: "bg-rose-50 border-rose-100" },
                  ].map(s => (
                    <div key={s.label} className={`rounded-2xl border p-3.5 ${s.color}`}>
                      <p className="text-xl">{s.emoji}</p>
                      <p className="text-2xl font-extrabold text-slate-800 mt-1">{s.value}</p>
                      <p className="text-xs text-slate-400 font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* AI insight card (sidebar) */}
              {!loading && globalInsights.length > 0 && (
                <div className="hidden lg:block">
                  <AIInsightCard insights={globalInsights} />
                </div>
              )}

              {/* Upcoming sidebar (desktop, first hero already shown) */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      ⏳ Nadchodzące
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Najbliższe 30 dni</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    {upcoming.length}
                  </span>
                </div>

                {upcoming.length === 0 ? (
                  <div className="px-5 pb-6 text-center">
                    <p className="text-3xl mb-1.5">🌙</p>
                    <p className="text-xs text-slate-400">Brak wydarzeń w najbliższym czasie.</p>
                  </div>
                ) : (
                  <ul className="px-3 pb-4 space-y-2">
                    {upcoming.slice(0, 5).map(ev => {
                      const isBirthday = ev.id.startsWith("birthday-");
                      const insight = aiInsights.get(ev.id);
                      return (
                        <li key={ev.id} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors group">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 ${avatarColor(ev.title.replace(/^🎂\s*/, ""))}`}>
                            {isBirthday ? "🎂" : CAT_EMOJI[ev.category ?? "default"] ?? "📌"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                              {ev.title.replace(/^🎂\s*/, "")}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-slate-400">{formatPLShort(ev.date)}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${urgencyColor(ev.date)}`}>
                                {daysLeftLabel(ev.date)}
                              </span>
                            </div>
                            {insight && (
                              <p className="text-[10px] text-violet-500 mt-1 leading-snug">✨ {insight}</p>
                            )}
                          </div>
                          {!isBirthday && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <Link
                                href={`/gift/start?eventId=${ev.id}&date=${encodeURIComponent(ev.date)}&title=${encodeURIComponent(ev.title)}`}
                                className="w-6 h-6 rounded-lg flex items-center justify-center bg-white border border-emerald-200 hover:bg-emerald-50 text-[10px] transition-colors"
                              >
                                🎁
                              </Link>
                              <button
                                onClick={() => openEdit(ev.id)}
                                className="w-6 h-6 rounded-lg flex items-center justify-center bg-white border border-sky-200 hover:bg-sky-50 text-[10px] transition-colors"
                              >
                                ✏️
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Import/Export (desktop sidebar) */}
              <div className="hidden lg:block bg-white/70 rounded-3xl border border-slate-100 shadow-sm p-4 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Importuj / Eksportuj
                </p>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-10 rounded-2xl border border-slate-200 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  📥 Import .ics
                </button>
                <button
                  onClick={exportICS}
                  className="w-full h-10 rounded-2xl border border-slate-200 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  📤 Export .ics
                </button>
              </div>
            </aside>
          </div>
        </div>

        {/* ──────────── MODALS ──────────── */}
        {addOpen && (
          <AddEditModal
            mode="add"
            date={mDate} title={mTitle} notes={mNotes} category={mCat}
            setDate={setMDate} setTitle={setMTitle} setNotes={setMNotes} setCategory={setMCat}
            onCancel={() => setAddOpen(false)} onSubmit={createEvent}
          />
        )}
        {editOpen && (
          <AddEditModal
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

        {/* Day preview sheet */}
        {daySheet && (
          <DayPreviewSheet
            date={daySheet}
            events={daySheetEvents}
            onClose={() => setDaySheet(null)}
            onAddEvent={ymd => { setDaySheet(null); openAdd(ymd); }}
            onOpenEvent={id => { setDaySheet(null); openEdit(id); }}
          />
        )}

        <ConfirmDialog state={confirm} onClose={() => setConfirm({ open: false })} />
      </div>
    </>
  );
}