"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import EventsCalendar, { type EventRow } from "@/components/EventsCalendar";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import Link from "next/link";

/* ═══════════════════════════════════════════
   CONSTANTS & HELPERS
═══════════════════════════════════════════ */

const CATEGORIES = [
  { value: "all",      label: "Wszystkie",   emoji: "✨" },
  { value: "birthday", label: "Urodziny",    emoji: "🎂" },
  { value: "work",     label: "Praca",       emoji: "💼" },
  { value: "personal", label: "Osobiste",    emoji: "⭐" },
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

const labelKat = (cat?: string | null) =>
  cat === "birthday" ? "Urodziny"
  : cat === "work"   ? "Praca"
  : cat === "personal" ? "Osobiste"
  : "Inne";

const formatPL = (ymd: string) =>
  new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(
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

function daysLeftLabel(ymd: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dt = new Date(ymd + "T00:00:00");
  const diff = Math.round((dt.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Dziś 🎉";
  if (diff === 1) return "Jutro";
  if (diff < 0)  return `${Math.abs(diff)} dni temu`;
  return `Za ${diff} dni`;
}

/* ─── ICS helpers ─── */
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

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
type Toast = { id: number; type: "success" | "error"; msg: string };
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, ...t }]);
    setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 3500);
  };
  return { toasts, push };
}

function ToastStack({ items }: { items: Toast[] }) {
  return (
    <div className="fixed top-5 right-4 z-[400] flex flex-col gap-2 pointer-events-none">
      {items.map(t => (
        <div
          key={t.id}
          className={`
            flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium
            backdrop-blur-sm pointer-events-auto
            ${t.type === "success"
              ? "bg-emerald-50/95 border-emerald-200 text-emerald-800"
              : "bg-red-50/95 border-red-200 text-red-800"}
          `}
          style={{ animation: "hd-pop .2s ease-out" }}
        >
          <span>{t.type === "success" ? "✅" : "❌"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   FOCUS TRAP
═══════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════
   CONFIRM DIALOG
═══════════════════════════════════════════ */
type ConfirmState =
  | { open: false }
  | { open: true; type: "delete" | "update"; title: string; description?: string; confirmText?: string; onConfirm: () => Promise<void> | void };

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
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4"
      role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle"
      onKeyDown={e => e.key === "Escape" && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={trapRef} className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-slate-100"
        style={{ animation: "hd-pop .2s ease-out" }}>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${danger ? "bg-red-100" : "bg-emerald-100"}`}>
          <span className="text-xl">{danger ? "🗑️" : "💾"}</span>
        </div>
        <h3 id="confirmTitle" className="text-base font-bold text-slate-900 mb-1">{title}</h3>
        {description && <p className="text-sm text-slate-500 mb-5">{description}</p>}
        <div className="flex gap-2">
          <button className="flex-1 border rounded-2xl h-11 text-sm font-medium hover:bg-slate-50 transition" onClick={onClose} disabled={busy}>
            Anuluj
          </button>
          <button
            className={`flex-1 h-11 rounded-2xl text-sm font-bold transition ${danger ? "bg-red-500 hover:bg-red-600 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white"}`}
            onClick={handleOk} disabled={busy}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ADD / EDIT MODAL
═══════════════════════════════════════════ */
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
  useEffect(() => { titleRef.current?.focus(); }, []);

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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onCancel} />
      <div
        ref={trapRef}
        className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
        style={{ animation: "hd-pop .22s ease-out" }}
      >
        {/* Header */}
        <div className={`px-6 pt-6 pb-4 ${mode === "add" ? "bg-gradient-to-r from-sky-50 to-cyan-50" : "bg-gradient-to-r from-amber-50 to-orange-50"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{mode === "add" ? "✨" : "✏️"}</span>
              <div>
                <h3 id="ae-title" className="font-bold text-slate-900 text-base">
                  {mode === "add" ? "Nowe wydarzenie" : "Edytuj wydarzenie"}
                </h3>
                {date && (
                  <p className="text-xs text-slate-500">{formatPL(date)}</p>
                )}
              </div>
            </div>
            <button onClick={onCancel} className="w-8 h-8 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-slate-500 transition">
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Назва */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Tytuł *</label>
            <input
              ref={titleRef}
              type="text"
              placeholder="np. Urodziny Mamy"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-2xl px-4 h-11 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition"
            />
          </div>

          {/* Дата */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Data *</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-2xl px-4 h-11 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
            />
          </div>

          {/* Категорія — сегментований контрол */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Kategoria</label>
            <div className="grid grid-cols-3 gap-2">
              {cats.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`h-10 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                    category === c.value
                      ? BADGE[c.value] + " shadow-sm scale-[1.02]"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span>{c.emoji}</span> {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Нотатки */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Notatki</label>
            <input
              type="text"
              placeholder="Opcjonalnie..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-slate-200 rounded-2xl px-4 h-11 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          {mode === "edit" && onDelete ? (
            <button onClick={onDelete}
              className="h-11 px-4 rounded-2xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition flex items-center gap-1.5">
              🗑️ Usuń
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onCancel}
              className="h-11 px-5 rounded-2xl border border-slate-200 text-sm font-medium hover:bg-slate-50 transition">
              Anuluj
            </button>
            <button
              onClick={onSubmit}
              disabled={!title || !date}
              className="h-11 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white text-sm font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {mode === "add" ? "Dodaj ✨" : "Zapisz ✅"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail]   = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState("all");

  /* Add modal */
  const [addOpen, setAddOpen] = useState(false);
  const [mDate, setMDate] = useState("");
  const [mTitle, setMTitle] = useState("");
  const [mNotes, setMNotes] = useState("");
  const [mCat, setMCat]   = useState("personal");

  /* Edit modal */
  const [editOpen, setEditOpen] = useState(false);
  const [eId, setEId]     = useState("");
  const [eTitle, setETitle] = useState("");
  const [eDate, setEDate]   = useState("");
  const [eNotes, setENotes] = useState("");
  const [eCat, setECat]     = useState("personal");

  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const { toasts, push } = useToasts();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showAll, setShowAll] = useState(false);
  const MAX = 3;

  /* remember last category */
  useEffect(() => {
    try { const l = localStorage.getItem("hd:lastCat"); if (l) { setMCat(l); setECat(l); } } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("hd:lastCat", mCat); } catch {}
  }, [mCat]);

  /* init + realtime */
  useEffect(() => {
    let ch: RealtimeChannel | null = null;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login"); return; }
      setEmail(user.email ?? null);

      const { data, error } = await supabase
        .from("events")
        .select("id,user_id,title,date,notes,category")
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      if (error) push({ type: "error", msg: "Nie udało się pobrać wydarzeń." });
      if (!error && data) setEvents(data as EventRow[]);
      setLoading(false);

      ch = supabase.channel("ev-ch")
        .on("postgres_changes",
          { event: "*", schema: "public", table: "events", filter: `user_id=eq.${user.id}` },
          (payload: RealtimePostgresChangesPayload<EventRow>) => {
            const sort = (arr: EventRow[]) => [...arr].sort((a, b) => a.date.localeCompare(b.date));
            if (payload.eventType === "INSERT") setEvents(p => sort([...p, payload.new as EventRow]));
            if (payload.eventType === "UPDATE") setEvents(p => sort(p.map(e => e.id === (payload.new as EventRow).id ? payload.new as EventRow : e)));
            if (payload.eventType === "DELETE") setEvents(p => p.filter(e => e.id !== (payload.old as EventRow).id));
          }
        ).subscribe();
    };
    init();
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [router, push]);

  /* Handlers */
  const openAdd = (ymd?: string) => {
    const d = ymd ?? (() => {
      const t = new Date();
      return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;
    })();
    setMDate(d); setMTitle(""); setMNotes(""); setAddOpen(true);
  };

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

  const openEdit = (id: string) => {
    const ev = events.find(e => e.id === id); if (!ev) return;
    setEId(ev.id); setETitle(ev.title); setEDate(ev.date);
    setENotes(ev.notes ?? ""); setECat(ev.category ?? "personal");
    setEditOpen(true);
  };

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

  const doDelete = (ev: EventRow) => {
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
  };

  /* Derived */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter(e => {
      const okCat = filterCat === "all" || (e.category ?? "default") === filterCat;
      const okQ = !q || `${e.title} ${e.notes ?? ""}`.toLowerCase().includes(q);
      return okCat && okQ;
    });
  }, [events, query, filterCat]);

  const upcoming = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const in30 = new Date(today); in30.setDate(today.getDate() + 30);
    return events
      .filter(e => { const d = new Date(e.date + "T00:00:00"); return d >= today && d <= in30; })
      .sort((a,b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [events]);

  const visible = showAll ? filtered : filtered.slice(0, MAX);

  /* Export */
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
      const { error } = await supabase.from("events").insert(items.map(i => ({ user_id: user.id, ...i, category: "personal" })));
      if (error) push({ type: "error", msg: "Import nie powiódł się." });
      else push({ type: "success", msg: `Zaimportowano ${items.length} wydarzeń 📥` });
    } catch { push({ type: "error", msg: "Błąd odczytu pliku." }); }
  };

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-rose-50">
      <ToastStack items={toasts} />

      {/* ── PAGE HEADER ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              🗓️ Moje wydarzenia
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Twój osobisty kalendarz szczęścia ✨
            </p>
            {email && (
              <p className="text-xs text-slate-400 mt-0.5">
                {email}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => openAdd()}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white text-sm font-bold shadow-md transition"
            >
              <span>＋</span>
              <span className="hidden sm:inline">Dodaj</span>
            </button>

            <input ref={fileRef} type="file" accept=".ics,text/calendar" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) importICS(f); e.currentTarget.value = ""; }} />

            <button onClick={() => fileRef.current?.click()}
              className="hidden sm:inline-flex items-center gap-1.5 h-10 px-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm transition">
              📥 Import
            </button>

            <button onClick={exportICS}
              className="hidden sm:inline-flex items-center gap-1.5 h-10 px-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm transition">
              📤 Export
            </button>
          </div>
        </div>
      </div>

      {/* ── UPCOMING BANNER (mobile) ── */}
      {upcoming.length > 0 && (
        <div className="lg:hidden max-w-5xl mx-auto px-4 sm:px-6 mt-4">
          <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Najbliższe wydarzenie</p>
            <p className="text-xl font-extrabold mt-1">{upcoming[0].title}</p>
            <p className="text-sm opacity-90 mt-0.5">{daysLeftLabel(upcoming[0].date)} · {formatPL(upcoming[0].date)}</p>
            <Link href={`/gift/start?eventId=${upcoming[0].id}`}
              className="inline-flex items-center gap-1.5 mt-3 bg-white/20 hover:bg-white/30 backdrop-blur px-4 py-2 rounded-xl text-sm font-semibold transition">
              🎁 Znajdź prezent
            </Link>
          </div>
        </div>
      )}

      {/* ── MAIN GRID ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ════ LEFT COLUMN ════ */}
          <div className="lg:col-span-8 space-y-5">

            {/* SEARCH & FILTERS */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔎</span>
                  <input
                    type="search"
                    placeholder="Szukaj wydarzeń…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="w-full pl-10 pr-4 h-11 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
                  />
                </div>

                {/* Category tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
                  {CATEGORIES.map(c => (
                    <button key={c.value} type="button"
                      onClick={() => setFilterCat(c.value)}
                      className={`flex-shrink-0 h-11 px-3.5 rounded-2xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                        filterCat === c.value
                          ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span>{c.emoji}</span>
                      <span className="hidden sm:inline">{c.label}</span>
                    </button>
                  ))}
                  {(query || filterCat !== "all") && (
                    <button onClick={() => { setQuery(""); setFilterCat("all"); }}
                      className="flex-shrink-0 h-11 px-3 rounded-2xl text-xs text-slate-400 hover:text-slate-600 border border-slate-200 hover:border-slate-300 transition">
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {filtered.length > 0 && (
                <p className="text-xs text-slate-400 mt-2.5 pl-1">
                  {filtered.length} {filtered.length === 1 ? "wynik" : "wyniki"}
                </p>
              )}
            </div>

            {/* EVENTS LIST */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <span>📋</span> Twoje wydarzenia
                </h2>
                <span className="text-xs text-slate-400 font-medium">{filtered.length} łącznie</span>
              </div>

              {loading ? (
                <div className="px-5 pb-5 space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-5 pb-8 text-center">
                  <p className="text-4xl mb-2">🌸</p>
                  <p className="text-slate-500 text-sm">Brak wyników dla wybranych filtrów.</p>
                  <button onClick={() => { setQuery(""); setFilterCat("all"); }}
                    className="mt-3 text-xs text-sky-500 hover:text-sky-700 font-medium transition">
                    Wyczyść filtry
                  </button>
                </div>
              ) : (
                <>
                  <ul className="divide-y divide-slate-50">
                    {visible.map(ev => {
                      const { day, mon } = dayBadgeParts(ev.date);
                      return (
                        <li key={ev.id}
                          className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition group">

                          {/* Date badge */}
                          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 shrink-0 group-hover:border-slate-200 transition">
                            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider leading-none">{mon}</span>
                            <span className="text-lg font-extrabold text-slate-800 leading-none">{day}</span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-slate-800 text-sm truncate">{ev.title}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${BADGE[ev.category ?? "default"] ?? BADGE.default}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${BADGE_DOT[ev.category ?? "default"] ?? BADGE_DOT.default}`} />
                                {labelKat(ev.category)}
                              </span>
                            </div>
                            {ev.notes && (
                              <p className="text-xs text-slate-400 mt-0.5 truncate">{ev.notes}</p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition sm:opacity-100">
                            <Link
                              href={`/gift/start?eventId=${ev.id}&date=${encodeURIComponent(ev.date)}&title=${encodeURIComponent(ev.title)}`}
                              className="w-8 h-8 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-sm transition"
                              title="Zrób prezent"
                            >
                              🎁
                            </Link>
                            <button onClick={() => openEdit(ev.id)}
                              className="w-8 h-8 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 flex items-center justify-center text-sm transition"
                              title="Edytuj">
                              ✏️
                            </button>
                            <button onClick={() => doDelete(ev)}
                              className="w-8 h-8 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 flex items-center justify-center text-sm transition"
                              title="Usuń">
                              🗑️
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {filtered.length > MAX && (
                    <div className="px-5 py-3 border-t border-slate-50">
                      <button onClick={() => setShowAll(v => !v)}
                        className="w-full h-10 rounded-2xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition font-medium">
                        {showAll ? "Ukryj" : `Pokaż wszystkie (${filtered.length - MAX} więcej)`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* CALENDAR */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <span>📅</span> Kalendarz
                </h2>
              </div>
              {loading ? (
                <div className="px-5 pb-5">
                  <div className="h-80 rounded-2xl bg-slate-100 animate-pulse" />
                </div>
              ) : (
                <div className="px-4 pb-5">
                  <EventsCalendar
                    items={filtered}
                    onDayClick={dateYMD => openAdd(dateYMD)}
                    onEventClick={openEdit}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ════ RIGHT COLUMN ════ */}
          <aside className="lg:col-span-4 space-y-5">

            {/* QUICK ADD button (desktop) */}
            <button onClick={() => openAdd()}
              className="hidden lg:flex w-full h-12 items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold shadow-md transition">
              ＋ Dodaj wydarzenie
            </button>

            {/* UPCOMING */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    🎁 Nadchodzące
                  </h3>
                  <p className="text-xs text-slate-400">Najbliższe 30 dni</p>
                </div>
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
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
                  {upcoming.map(ev => (
                    <li key={ev.id}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 transition group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{ev.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400">{formatPL(ev.date)}</span>
                          <span className="text-[10px] font-semibold text-cyan-600 bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded-full">
                            {daysLeftLabel(ev.date)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <Link
                          href={`/gift/start?eventId=${ev.id}&date=${encodeURIComponent(ev.date)}&title=${encodeURIComponent(ev.title)}`}
                          className="w-7 h-7 rounded-xl flex items-center justify-center bg-white border border-emerald-200 hover:bg-emerald-50 text-xs transition"
                          title="Zrób prezent">🎁</Link>
                        <button onClick={() => openEdit(ev.id)}
                          className="w-7 h-7 rounded-xl flex items-center justify-center bg-white border border-sky-200 hover:bg-sky-50 text-xs transition"
                          title="Edytuj">✏️</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ICS ACTIONS (mobile/desktop) */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Importuj / Eksportuj</p>
              <button onClick={() => fileRef.current?.click()}
                className="w-full h-11 rounded-2xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition flex items-center justify-center gap-2">
                📥 Import .ics
              </button>
              <button onClick={exportICS}
                className="w-full h-11 rounded-2xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition flex items-center justify-center gap-2">
                📤 Export .ics
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* MODALS */}
      {addOpen && (
        <AddEditModal mode="add"
          date={mDate} title={mTitle} notes={mNotes} category={mCat}
          setDate={setMDate} setTitle={setMTitle} setNotes={setMNotes} setCategory={setMCat}
          onCancel={() => setAddOpen(false)} onSubmit={createEvent} />
      )}
      {editOpen && (
        <AddEditModal mode="edit"
          date={eDate} title={eTitle} notes={eNotes} category={eCat}
          setDate={setEDate} setTitle={setETitle} setNotes={setENotes} setCategory={setECat}
          onCancel={() => setEditOpen(false)} onSubmit={saveEdit}
          onDelete={() => { doDelete({ id: eId, title: eTitle, date: eDate, notes: eNotes, category: eCat }); setEditOpen(false); }} />
      )}
      <ConfirmDialog state={confirm} onClose={() => setConfirm({ open: false })} />
    </div>
  );
}