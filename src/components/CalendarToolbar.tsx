"use client";

import React from "react";
import { Views, type View, type ToolbarProps } from "react-big-calendar";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("dashboard.navigation");
  const available = normalizeViews(views);
  const order: View[] = [Views.MONTH, Views.WEEK, Views.DAY];
  const toShow = order.filter((v) => available.includes(v));

  return (
    <div className="px-3 py-3 flex flex-col gap-3">
      {/* Рядок: навігація + заголовок */}
      <div className="flex items-center justify-between gap-2">
        {/* Назад */}
        <button
          type="button"
          onClick={() => onNavigate("PREV")}
          aria-label={t("previousMonth")}
          className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-95 transition text-sm"
        >
          ‹
        </button>

        {/* Заголовок + кнопка "Сьогодні" */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-sm font-bold text-slate-800 capitalize">
            {label}
          </span>
          <button
            type="button"
            onClick={() => onNavigate("TODAY")}
            className="text-[10px] text-sky-500 font-semibold hover:text-sky-700 transition"
          >
            {t("today")}
          </button>
        </div>

        {/* Вперед */}
        <button
          type="button"
          onClick={() => onNavigate("NEXT")}
          aria-label={t("nextMonth")}
          className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-95 transition text-sm"
        >
          ›
        </button>
      </div>

      {/* Вкладки вигляду */}
      <div className="flex rounded-xl bg-slate-100 p-0.5 gap-0.5">
        {toShow.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onView(v)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              view === v
                ? "bg-white text-sky-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {v === Views.MONTH
              ? t("month")
              : v === Views.WEEK
              ? t("week")
              : t("day")}
          </button>
        ))}
      </div>
    </div>
  );
}
