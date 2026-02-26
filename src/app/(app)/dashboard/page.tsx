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

/* ——— Категорії та стилі бейджів ——— */
const CATEGORIES = [
  { value: "all", label: "Wszystkie" },
  { value: "birthday", label: "Urodziny 🎂" },
  { value: "work", label: "Praca 💼" },
  { value: "personal", label: "Osobiste ⭐" },
] as const;

const badgeClass = (category?: string | null) => {
  switch (category) {
    case "birthday":
      return "bg-pink-50 text-pink-700 border border-pink-200";
    case "work":
      return "bg-amber-50 text-amber-800 border border-amber-200";
    case "personal":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    default:
      return "bg-slate-50 text-slate-700 border border-slate-200";
  }
};
const labelKat = (cat?: string | null) =>
  cat === "birthday" ? "Urodziny" : cat === "work" ? "Praca" : cat === "personal" ? "Osobiste" : "Inne";

/* ——— helpers ——— */
const formatPL = (ymd: string) =>
  new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(new Date(ymd + "T00:00:00"));

const monthShortPL = new Intl.DateTimeFormat("pl-PL", { month: "short" });
function dayBadgeParts(ymd: string) {
  const d = new Date(ymd + "T00:00:00");
  return { day: d.getDate().toString().padStart(2, "0"), mon: monthShortPL.format(d) };
}

/* ——— helpers for .ics ——— */
function toUTCStamp(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}
function addOneDay(yyyymmdd: string) {
  const y = Number(yyyymmdd.slice(0, 4));
  const m = Number(yyyymmdd.slice(4, 6)) - 1;
  const d = Number(yyyymmdd.slice(6, 8));
  const dt = new Date(Date.UTC(y, m, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return dt.getUTCFullYear().toString() + pad(dt.getUTCMonth() + 1) + pad(dt.getUTCDate());
}
function escapeICS(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/* ——— Відлік днів до події (для правого віджета) ——— */
function daysLeftLabel(ymd: string) {
  const today = new Date(); today.setHours(0,0,0,0);
  const dt = new Date(ymd + "T00:00:00");
  const diff = Math.round((dt.getTime() - today.getTime()) / 86400000);

  if (diff === 0) return "Dziś";
  if (diff === 1) return "Jutro";
  if (diff < 0) return `${Math.abs(diff)} dni temu`;
  return `Za ${diff} dni`;
}

/* ——— Toast ——— */
type Toast = { id: number; type: "success" | "error"; msg: string };
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500);
  };
  return { toasts, push };
}
function ToastContainer({ items }: { items: Toast[] }) {
  return (
    <div className="fixed top-4 right-4 z-[300] space-y-2">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`rounded-2xl px-4 py-2 shadow-lg border ${
            t.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ——— Підтвердження ——— */
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

function useFocusTrap(active: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;

    const focusables = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((n) => !n.hasAttribute("disabled"));

    const first = focusables()[0];
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = focusables();
      if (nodes.length === 0) return;
      const cur = document.activeElement as HTMLElement;
      const idx = nodes.indexOf(cur);
      if (e.shiftKey) {
        if (idx <= 0) {
          e.preventDefault();
          nodes[nodes.length - 1].focus();
        }
      } else {
        if (idx === nodes.length - 1) {
          e.preventDefault();
          nodes[0].focus();
        }
      }
    };

    const handler = (e: KeyboardEvent) => onKey(e);
    el.addEventListener("keydown", handler);

    return () => {
      el.removeEventListener("keydown", handler);
    };
  }, [active]);

  return ref;
}

function ConfirmDialog({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const trapRef = useFocusTrap(state.open);
  if (!state.open) return null;
  const { title, description, confirmText = "Potwierdź", onConfirm, type } = state;
  const danger = type === "delete";

  const handleOk = async () => {
    try {
      setBusy(true);
      await onConfirm();
    } catch {
      /* ignore here, toasts показуються зовні */
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="alertdialog"
      aria-labelledby="confirmTitle"
      aria-describedby="confirmDesc"
      aria-modal="true"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div ref={trapRef} className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl border border-white/60 p-5">
        <h3 id="confirmTitle" className="text-lg font-bold mb-2">
          {title}
        </h3>
        {description ? (
          <p id="confirmDesc" className="text-slate-600 mb-4">
            {description}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button className="border rounded-2xl px-4 h-10 hover:bg-slate-50" onClick={onClose} disabled={busy}>
            Anuluj
          </button>
          <button
            className={`px-4 h-10 rounded-2xl font-semibold ${
              danger ? "bg-red-600 text-white hover:bg-red-700" : "bg-emerald-500 text-white hover:bg-emerald-600"
            }`}
            onClick={handleOk}
            disabled={busy}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  // фільтри
  const [query, setQuery] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // 🔵 MODAL: додавання
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<string>("");
  const [modalTitle, setModalTitle] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [modalCategory, setModalCategory] = useState<string>("personal");

  // 🟠 MODAL: редагування
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [emId, setEmId] = useState<string>("");
  const [emTitle, setEmTitle] = useState("");
  const [emDate, setEmDate] = useState("");
  const [emNotes, setEmNotes] = useState("");
  const [emCategory, setEmCategory] = useState<string>("personal");

  // підтвердження
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });

  // toasts
  const { toasts, push } = useToasts();

  // file input для імпорту
  const fileRef = useRef<HTMLInputElement>(null);

  // запам’ятати останню категорію
  useEffect(() => {
    try {
      const last = localStorage.getItem("hd:lastCategory");
      if (last) {
        setModalCategory(last);
        setEmCategory(last);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (modalCategory) localStorage.setItem("hd:lastCategory", modalCategory);
    } catch {}
  }, [modalCategory]);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      setEmail(user.email ?? null);

      // тягнемо лише свої події
      const { data, error } = await supabase
        .from("events")
        .select("id, user_id, title, date, notes, category")
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      if (error) {
        push({ type: "error", msg: "Nie udało się pobrać wydarzeń." });
      }
      if (!error && data) setEvents(data as EventRow[]);
      setLoading(false);

      // realtime: тільки свої події
      channel = supabase
        .channel("events-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "events", filter: `user_id=eq.${user.id}` },
          (payload: RealtimePostgresChangesPayload<EventRow>) => {
            if (payload.eventType === "INSERT") {
              const ne = payload.new as EventRow;
              setEvents((prev) => [...prev, ne].sort((a, b) => a.date.localeCompare(b.date)));
            }
            if (payload.eventType === "UPDATE") {
              const up = payload.new as EventRow;
              setEvents((prev) => prev.map((e) => (e.id === up.id ? up : e)).sort((a, b) => a.date.localeCompare(b.date)));
            }
            if (payload.eventType === "DELETE") {
              const del = payload.old as EventRow;
              setEvents((prev) => prev.filter((e) => e.id !== del.id));
            }
          }
        )
        .subscribe();
    };
    init();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [router, push]);

  // Верхня кнопка: модалка додавання з сьогоднішньою датою
  const openAddModalNow = () => {
    const today = new Date();
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;
    setModalDate(ymd);
    setModalTitle("");
    setModalNotes("");
    setIsAddModalOpen(true);
  };

  // 📌 КЛІК ПО ДАТІ В КАЛЕНДАРІ → модалка додавання з обраною датою
  const handlePickDateFromCalendar = (dateYMD: string) => {
    setModalDate(dateYMD);
    setModalTitle("");
    setModalNotes("");
    setIsAddModalOpen(true);
  };

  // створення з модалки
  const createFromModal = async () => {
    if (!modalTitle.trim() || !modalDate) {
      push({ type: "error", msg: "Uzupełnij tytuł i datę." });
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    const { error } = await supabase.from("events").insert([
      { user_id: user.id, title: modalTitle.trim(), date: modalDate, notes: modalNotes.trim() || null, category: modalCategory },
    ]);
    if (error) push({ type: "error", msg: "Nie udało się dodać wydarzenia." });
    else push({ type: "success", msg: "Dodano wydarzenie 🎉" });
    setIsAddModalOpen(false);
  };

  // 🟠 редагування
  const openEditModalById = (id: string) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    setEmId(ev.id);
    setEmTitle(ev.title);
    setEmDate(ev.date);
    setEmNotes(ev.notes ?? "");
    setEmCategory(ev.category ?? "personal");
    setIsEditModalOpen(true);
  };

  const saveEditFromModal = async () => {
    if (!emId) return;
    const snapshot = {
      id: emId,
      title: emTitle.trim(),
      date: emDate,
      notes: emNotes.trim() || null,
      category: emCategory || null,
    };
    if (!snapshot.title || !snapshot.date) {
      push({ type: "error", msg: "Tytuł i data są wymagane." });
      return;
    }
    setConfirm({
      open: true,
      type: "update",
      title: "Zapisz zmiany wydarzenia?",
      description: `„${snapshot.title}” — ${formatPL(snapshot.date)}`,
      confirmText: "Zapisz",
      onConfirm: async () => {
        const { error } = await supabase.from("events").update(snapshot).eq("id", snapshot.id);
        if (error) push({ type: "error", msg: "Nie udało się zapisać zmian." });
        else push({ type: "success", msg: "Зaktualizowano wydarzenie ✅" });
        setIsEditModalOpen(false);
      },
    });
  };

  // підтвердження видалення
  const confirmDelete = (ev: { id: string; title: string; date: string }) => {
    setConfirm({
      open: true,
      type: "delete",
      title: "Usunąć wydarzenie?",
      description: `„${ev.title}” — ${formatPL(ev.date)}`,
      confirmText: "Usuń",
      onConfirm: async () => {
        const { error } = await supabase.from("events").delete().eq("id", ev.id);
        if (error) push({ type: "error", msg: "Nie udało się usunąć wydarzenia." });
        else push({ type: "success", msg: "Usunięto wydarzenie 🗑️" });
      },
    });
  };

  // фільтрація
  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      const okCategory = filterCategory === "all" || (e.category ?? "default") === filterCategory;
      const hay = `${e.title} ${e.notes ?? ""}`.toLowerCase();
      const okQuery = !q || hay.includes(q);
      return okCategory && okQuery;
    });
  }, [events, query, filterCategory]);

  // найближчі 30 днів
  const upcoming = useMemo(() => {
    const today = new Date();
    const in30 = new Date();
    in30.setDate(today.getDate() + 30);
    return events
      .filter((e) => {
        const d = new Date(`${e.date}T00:00:00`);
        return d >= new Date(today.toDateString()) && d <= in30;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);
  }, [events]);

  // експорт .ics
  const exportICS = () => {
    const lines: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HappyDate//Calendar//PL", "CALSCALE:GREGORIAN"];
    filteredEvents.forEach((e) => {
      const dt = e.date.replaceAll("-", "");
      const summary = escapeICS(e.title);
      const desc = escapeICS(e.notes ?? "");
      lines.push(
        "BEGIN:VEVENT",
        `UID:${e.id}@happydate`,
        `DTSTAMP:${toUTCStamp(new Date())}`,
        `DTSTART;VALUE=DATE:${dt}`,
        `DTEND;VALUE=DATE:${addOneDay(dt)}`,
        `SUMMARY:${summary}`,
        desc ? `DESCRIPTION:${desc}` : "",
        "END:VEVENT"
      );
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.filter(Boolean).join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "happydate.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  // імпорт .ics
  const importICS = async (file: File) => {
    try {
      const text = await file.text();
      const eventsRaw = text.split("BEGIN:VEVENT").slice(1).map((blk) => "BEGIN:VEVENT" + blk);
      const items: { title: string; date: string; notes: string | null }[] = [];
      for (const raw of eventsRaw) {
        const get = (re: RegExp) => raw.match(re)?.[1]?.trim();
        const dt = get(/DTSTART(?:;[^:]+)?:([0-9]{8})/);
        const title = get(/SUMMARY:(.+)/);
        const descLine = get(/DESCRIPTION:(.+)/);
        if (!dt || !title) continue;
        const y = dt.slice(0, 4);
        const m = dt.slice(4, 6);
        const d = dt.slice(6, 8);
        items.push({
          title: title.replace(/\\n/g, "\n").replace(/\\,/g, ","),
          date: `${y}-${m}-${d}`,
          notes: descLine ? descLine.replace(/\\n/g, "\n").replace(/\\,/g, ",") : null
        });
      }
      if (items.length === 0) {
        push({ type: "error", msg: "Nie znaleziono wydarzeń w pliku .ics." });
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      const payload = items.map((i) => ({
        user_id: user.id,
        title: i.title,
        date: i.date,
        notes: i.notes,
        category: "personal" as const,
      }));
      const { error } = await supabase.from("events").insert(payload);
      if (error) push({ type: "error", msg: "Import nie powiódł się." });
      else push({ type: "success", msg: `Zaimportowano ${payload.length} wydarzeń 📥` });
    } catch {
      push({ type: "error", msg: "Błąd odczytu pliku .ics." });
    }
  };

  /* ——— Відображення списку «Twoje wydarzenia» компактно з Show more ——— */
  const [showAllEvents, setShowAllEvents] = useState(false);
  const MAX_COLLAPSED = 2;
  const totalFiltered = filteredEvents.length;
  const visibleEvents = showAllEvents ? filteredEvents : filteredEvents.slice(0, MAX_COLLAPSED);

  /* ——— РЕНДЕР ——— */
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-rose-50 to-amber-50">
      <ToastContainer items={toasts} />

      {/* Top bar with actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <span>🗓️</span>
              <span>Moje wydarzenia</span>
            </h1>
            <p className="mt-1 text-slate-600">
              Twój osobisty kalendarz szczęścia — nie zapomnij o ważnych chwilach ✨
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openAddModalNow}
              className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold px-4 py-2 h-10 rounded-2xl shadow-[0_6px_0_0_rgba(0,0,0,0.08)]"
              title="Dodaj wydarzenie"
            >
              <span>➕</span> Dodaj wydarzenie
            </button>

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
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border px-4 py-2 h-10 rounded-2xl"
              title="Import z .ics"
            >
              Import .ics
            </button>

            <button
              onClick={exportICS}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-600 hover:to-pink-600 text-white font-semibold px-4 py-2 h-10 rounded-2xl shadow-[0_6px_0_0_rgba(0,0,0,0.10)]"
              title="Eksportuj do kalendarza"
            >
              Eksport .ics
            </button>
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-0 pt-6">
        {/* MOBILE HERO */}
  <div className="lg:hidden mb-6">
    {upcoming.length > 0 && (
      <div className="bg-gradient-to-r from-pink-500 to-amber-400 text-white rounded-3xl p-5 shadow-lg">
        <p className="text-sm opacity-90">Najbliższe wydarzenie</p>

        <h2 className="text-xl font-bold">
          {upcoming[0].title}
        </h2>

        <p className="text-sm opacity-90">
          {daysLeftLabel(upcoming[0].date)}
        </p>

        <Link
          href={`/gift/start?eventId=${upcoming[0].id}`}
          className="inline-block mt-3 bg-white text-pink-600 px-4 py-2 rounded-xl font-semibold"
        >
          🎁 Znajdź prezent
        </Link>
      </div>
    )}
  </div>

  {/* Two columns */}
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-8">
            <div className="bg-white/80 backdrop-blur rounded-3xl shadow-xl p-5 sm:p-7 border border-white/60">
              {/* email */}
              {email && (
                <p className="text-sm text-slate-500 mb-4">
                  Zalogowany jako: <span className="font-medium">{email}</span>
                </p>
              )}

              {/* Filters */}
              <div className="bg-white border rounded-2xl p-4 mb-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔎</span>
                    <input
                      type="search"
                      placeholder="Szukaj w tytule lub notatkach…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="border rounded-xl pl-9 pr-3 p-2 h-10 w-full"
                      aria-label="Szukaj"
                    />
                  </div>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="border rounded-xl p-2 h-10"
                    aria-label="Kategoria"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setFilterCategory("all");
                    }}
                    className="border rounded-xl p-2 h-10 hover:bg-slate-50"
                  >
                    Wyczyść filtry
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Wyników: <span className="font-semibold">{filteredEvents.length}</span>
                </p>
              </div>

              {/* 📋 Twoje wydarzenia — компактний згортаний список */}
              <div className="mb-6">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <span>📋</span> <span>Twoje wydarzenia</span>
                </h2>

                {loading ? (
                  <p className="text-slate-500">Ładowanie…</p>
                ) : totalFiltered === 0 ? (
                  <p className="text-slate-500">Brak wyników dla wybranych filtrów.</p>
                ) : (
                  <>
                    <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                      {visibleEvents.map((ev) => {
                        const { day, mon } = dayBadgeParts(ev.date);
                        return (
                          <li key={ev.id} className="px-3 py-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {/* дата-бейдж (компактний) */}
                              <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg border bg-slate-50 shrink-0">
                                <span className="text-[10px] uppercase text-slate-500 leading-none">{mon}</span>
                                <span className="text-base font-bold text-slate-800 leading-none">{day}</span>
                              </div>
                              {/* контент */}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium truncate">{ev.title}</p>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${badgeClass(ev.category)}`}>
                                    {labelKat(ev.category)}
                                  </span>
                                </div>
                                {ev.notes && <p className="text-xs text-slate-600 mt-0.5 truncate">{ev.notes}</p>}
                              </div>
                            </div>

                            {/* дії */}
                            <div className="flex items-center gap-1 shrink-0">
                              {/* CTA: Zrób prezent */}
                              <Link
                                href={`/gift/start?eventId=${ev.id}&date=${encodeURIComponent(ev.date)}&title=${encodeURIComponent(ev.title)}`}
                                className="inline-flex items-center gap-1 px-2 h-8 rounded-xl border text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-sm"
                                aria-label="Zrób prezent"
                                title="Zrób prezent"
                              >
                                🎁 <span className="hidden sm:inline">Zrób prezent</span>
                              </Link>

                              <button
                                onClick={() => openEditModalById(ev.id)}
                                className="inline-flex items-center gap-1 px-2 h-8 rounded-xl border hover:bg-slate-50 text-blue-700 border-blue-200 text-sm"
                                aria-label="Edytuj"
                                title="Edytuj"
                              >
                                ✏️ <span className="hidden sm:inline">Edytuj</span>
                              </button>
                              <button
                                onClick={() => confirmDelete(ev)}
                                className="inline-flex items-center gap-1 px-2 h-8 rounded-xl border hover:bg-red-50 text-red-700 border-red-200 text-sm"
                                aria-label="Usuń"
                                title="Usuń"
                              >
                                🗑 <span className="hidden sm:inline">Usuń</span>
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    {totalFiltered > MAX_COLLAPSED && (
                      <div className="mt-2 flex justify-center">
                        <button
                          className="text-sm px-3 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50"
                          onClick={() => setShowAllEvents((v) => !v)}
                        >
                          {showAllEvents ? "Ukryj" : `Pokaż wszystkie (${totalFiltered - MAX_COLLAPSED})`}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Календар */}
              <div>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <span>🗓️</span> <span>Kalendarz</span>
                </h2>
                {loading ? (
                  <p className="text-slate-500">Ładowanie…</p>
                ) : (
                  <EventsCalendar
                    items={filteredEvents}
                    onDayClick={handlePickDateFromCalendar}
                    onEventClick={openEditModalById}
                  />
                )}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <aside className="lg:col-span-4">
            <div className="bg-white/80 backdrop-blur rounded-3xl shadow-xl p-5 border border-white/60 sticky top-6">
              <div className="flex items-center gap-2 mb-1">
                <span>🎁</span>
                <h3 className="font-semibold text-slate-800">Nadchodzące wydarzenia</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">Najbliższe 30 dni</p>

              {upcoming.length === 0 ? (
                <p className="text-slate-500 text-sm">Brak wydarzeń w najbliższym czasie.</p>
              ) : (
                <ul className="space-y-3">
                  {upcoming.map((ev) => (
                    <li key={ev.id} className="bg-white border rounded-2xl p-3 flex items-center justify-between shadow-sm">
                      <div>
                        <p className="font-medium">{ev.title}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(ev.date + "T00:00:00").toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* mini-CTA у віджеті */}
                        <Link
                          href={`/gift/start?eventId=${ev.id}&date=${encodeURIComponent(ev.date)}&title=${encodeURIComponent(ev.title)}`}
                          className="text-[12px] px-2 py-1 rounded-full border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                          aria-label="Zrób prezent"
                          title="Zrób prezent"
                        >
                          🎁
                        </Link>

                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-cyan-200 text-cyan-700 bg-cyan-50">
                          {daysLeftLabel(ev.date)}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${badgeClass(ev.category)}`}>
                          {labelKat(ev.category)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* 🔵 MODAL: Dodaj wydarzenie */}
      {isAddModalOpen && (
        <AddEditModal
          mode="add"
          date={modalDate}
          title={modalTitle}
          notes={modalNotes}
          category={modalCategory}
          setDate={setModalDate}
          setTitle={setModalTitle}
          setNotes={setModalNotes}
          setCategory={setModalCategory}
          onCancel={() => setIsAddModalOpen(false)}
          onSubmit={createFromModal}
        />
      )}

      {/* 🟠 MODAL: Edytuj wydarzenie */}
      {isEditModalOpen && (
        <AddEditModal
          mode="edit"
          date={emDate}
          title={emTitle}
          notes={emNotes}
          category={emCategory}
          setDate={setEmDate}
          setTitle={setEmTitle}
          setNotes={setEmNotes}
          setCategory={setEmCategory}
          onCancel={() => setIsEditModalOpen(false)}
          onDelete={() => confirmDelete({ id: emId, title: emTitle, date: emDate })}
          onSubmit={saveEditFromModal}
        />
      )}

      {/* Глобальне вікно підтвердження */}
      <ConfirmDialog state={confirm} onClose={() => setConfirm({ open: false })} />
    </main>
  );
}

/* ——— Універсальна модалка Add/Edit ——— */
function AddEditModal({
  mode,
  date,
  title,
  notes,
  category,
  setDate,
  setTitle,
  setNotes,
  setCategory,
  onCancel,
  onSubmit,
  onDelete,
}: {
  mode: "add" | "edit";
  date: string;
  title: string;
  notes: string;
  category: string;
  setDate: (v: string) => void;
  setTitle: (v: string) => void;
  setNotes: (v: string) => void;
  setCategory: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  onDelete?: () => void;
}) {
  const trapRef = useFocusTrap(true);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onCancel();
    if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ae-title"
      className="fixed inset-0 z-[220] flex items-center justify-center"
      onKeyDown={handleKey}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div ref={trapRef} className="relative bg-white rounded-3xl shadow-2xl w-[92vw] max-w-lg p-5 border border-white/60">
        <h3 id="ae-title" className="text-lg font-bold mb-4">
          {mode === "add" ? "Dodaj wydarzenie" : "Edytuj wydarzenie"} —{" "}
          {date ? new Date(date + "T00:00:00").toLocaleDateString() : "—"}
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <input
            ref={titleRef}
            type="text"
            placeholder="Tytuł"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border rounded-xl p-2 h-10"
            aria-label="Tytuł"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded-xl p-2 h-10"
              aria-label="Data"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border rounded-xl p-2 h-10"
              aria-label="Kategoria"
            >
              {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            placeholder="Notatki (opcjonalnie)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border rounded-xl p-2 h-10"
            aria-label="Notatki"
          />
        </div>

        <div className="mt-5 flex justify-between">
          {mode === "edit" ? (
            <button
              onClick={onDelete}
              className="border border-red-300 text-red-700 rounded-2xl px-4 h-10 hover:bg-red-50"
            >
              Usuń
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onCancel} className="border rounded-2xl px-4 h-10 hover:bg-slate-50">
              Anuluj
            </button>
            <button
              onClick={onSubmit}
              className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold px-4 h-10 rounded-2xl shadow-[0_6px_0_0_rgba(0,0,0,0.08)]"
              disabled={!title || !date}
            >
              {mode === "add" ? "Dodaj" : "Zapisz"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
