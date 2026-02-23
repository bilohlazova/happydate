"use client";

import React from "react";
import { Views, type View, type ToolbarProps } from "react-big-calendar";

/** Нормалізація props.views → масив View */
function normalizeViews(views: ToolbarProps["views"]): View[] {
  if (!views) return [Views.MONTH, Views.WEEK, Views.DAY];
  if (Array.isArray(views)) return views as View[];
  return Object.entries(views)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([k]) => k as View);
}

export default function CalendarToolbar({
  label,
  view,
  views,
  onView,
  onNavigate,
}: ToolbarProps) {
  const available = normalizeViews(views);
  const order: View[] = [Views.MONTH, Views.WEEK, Views.DAY];
  const toShow = order.filter((v) => available.includes(v));

  const tab = (active: boolean) =>
    `h-9 px-3 rounded-full text-sm transition ${
      active
        ? "bg-sky-600 text-white shadow-[0_2px_6px_rgba(2,132,199,0.35)]"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
    }`;

  const btn =
    "h-9 px-3 rounded-full border border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-300";

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {/* Навігація */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btn}
          onClick={() => onNavigate("PREV")}
          aria-label="Poprzedni okres"
          title="Poprzedni"
        >
          ◀︎
        </button>
        <button
          type="button"
          className={`${btn} font-medium`}
          onClick={() => onNavigate("TODAY")}
          aria-label="Przejdź do dziś"
          title="Dziś"
        >
          Dziś
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => onNavigate("NEXT")}
          aria-label="Następny okres"
          title="Następny"
        >
          ▶︎
        </button>
      </div>

      {/* Поточний період */}
      <div
        className="mx-2 min-w-[12ch] text-center font-semibold text-slate-800 select-none"
        aria-live="polite"
      >
        {label}
      </div>

      {/* Перемикачі-вкладки */}
      <div className="ml-auto flex items-center gap-2">
        {toShow.map((v) => (
          <button
            key={v}
            type="button"
            className={tab(view === v)}
            onClick={() => onView(v)}
            aria-pressed={view === v}
            title={
              v === Views.MONTH ? "Widok: Miesiąc" : v === Views.WEEK ? "Widok: Tydzień" : "Widok: Dzień"
            }
          >
            {v === Views.MONTH ? "Miesiąc" : v === Views.WEEK ? "Tydzień" : "Dzień"}
          </button>
        ))}
      </div>
    </div>
  );
}
