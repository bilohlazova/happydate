"use client";

import React from "react";
import { Views, type View, type ToolbarProps } from "react-big-calendar";

/* Нормалізація views */
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

  const navBtn =
    "h-8 w-8 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 active:scale-95 transition";

  const tabBtn = (active: boolean) =>
    `h-8 px-3 rounded-full text-xs transition ${
      active
        ? "bg-sky-600 text-white shadow"
        : "bg-slate-100 text-slate-700"
    }`;

  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

      {/* Верхній ряд (на мобільному) */}
      <div className="flex items-center justify-between">

        {/* Навігація */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={navBtn}
            onClick={() => onNavigate("PREV")}
            aria-label="Poprzedni"
          >
            ◀
          </button>

          <button
            type="button"
            className="h-8 px-3 rounded-full bg-slate-100 text-xs"
            onClick={() => onNavigate("TODAY")}
          >
            Dziś
          </button>

          <button
            type="button"
            className={navBtn}
            onClick={() => onNavigate("NEXT")}
            aria-label="Następny"
          >
            ▶
          </button>
        </div>

        {/* Поточний період */}
        <div
          className="text-sm font-semibold text-slate-800 text-right sm:text-center"
          aria-live="polite"
        >
          {label}
        </div>
      </div>

      {/* Вкладки */}
      <div className="flex justify-center sm:justify-end gap-2">
        {toShow.map((v) => (
          <button
            key={v}
            type="button"
            className={tabBtn(view === v)}
            onClick={() => onView(v)}
          >
            {v === Views.MONTH
              ? "Miesiąc"
              : v === Views.WEEK
              ? "Tydzień"
              : "Dzień"}
          </button>
        ))}
      </div>
    </div>
  );
}