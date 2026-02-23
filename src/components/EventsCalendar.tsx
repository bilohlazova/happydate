"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  Event as RBCEvent,
  Views,
  type View,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay, isSameMonth, isToday } from "date-fns";
import { pl } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import CalendarToolbar from "./CalendarToolbar";

/* ===== Типи ===== */
export type EventRow = {
  id: string;
  title: string;       // tytuł
  date: string;        // YYYY-MM-DD
  notes?: string | null;
  category?: string | null;
};

type CalendarEvent = RBCEvent & {
  resource?: {
    id: string;                   // наш ID
    notes?: string | null;
    category?: string | null;
  };
};

/* ===== Локалізатор ===== */
const LOCALIZER = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { pl },
});

/* ===== Стилі категорій ===== */
const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  birthday: { bg: "#ffe4f1", text: "#9b1b57", border: "#f9c2db" },
  work:     { bg: "#fff4e0", text: "#7a4a00", border: "#ffd9a8" },
  personal: { bg: "#e9fff3", text: "#11663c", border: "#baf3d3" },
  default:  { bg: "#eef2f7", text: "#1f2937", border: "#d1d5db" },
};

function toYMD(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function EventsCalendar({
  items,
  onDayClick,
  onEventClick,
}: {
  items: EventRow[];
  onDayClick?: (dateYMD: string) => void;
  onEventClick?: (eventId: string) => void;
}) {
  /* Стан */
  const [view, setView] = useState<View>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const handleView = useCallback((v: View) => setView(v), []);
  const handleNavigate = useCallback((date: Date) => setCurrentDate(date), []);

  /* Події */
  const events: CalendarEvent[] = useMemo(
    () =>
      (items || []).map<CalendarEvent>((e) => {
        const start = new Date(`${e.date}T00:00:00`);
        const end = new Date(start);
        end.setDate(end.getDate() + 1); // allDay на 1 день
        return {
          id: e.id,
          title: e.title,
          start,
          end,
          allDay: true,
          resource: {
            id: e.id,
            notes: e.notes ?? null,
            category: e.category ?? "default",
          },
        };
      }),
    [items]
  );

  /* Локалізовані повідомлення */
  const messages = useMemo(
    () => ({
      next: "Następny",
      previous: "Poprzedni",
      today: "Dziś",
      month: "Miesiąc",
      week: "Tydzień",
      day: "Dzień",
      agenda: "Agenda",
      showMore: (count: number) => `+${count} więcej`,
    }),
    []
  );

  /* Формати */
  const formats = useMemo(
    () => ({
      dayFormat: (date: Date) => format(date, "dd", { locale: pl }),
      weekdayFormat: (date: Date) => format(date, "EEE", { locale: pl }),
      monthHeaderFormat: (date: Date) => format(date, "LLLL yyyy", { locale: pl }),
    }),
    []
  );

  /* Стилі подій */
  const eventPropGetter = useMemo(
    () =>
      (event: CalendarEvent) => {
        const cat = event.resource?.category ?? "default";
        const c = CATEGORY_STYLES[cat] ?? CATEGORY_STYLES.default;
        const prefix =
          cat === "birthday" ? "🎂 " : cat === "work" ? "💼 " : cat === "personal" ? "⭐ " : "• ";
        return {
          style: {
            backgroundColor: c.bg,
            color: c.text,
            border: `1px solid ${c.border}`,
            borderRadius: "6px",
            padding: "2px 6px",
            fontWeight: 600,
          },
          title: prefix + event.title + (event.resource?.notes ? ` — ${event.resource.notes}` : ""),
        };
      },
    []
  );

  /* Стилі клітинок днів (власний клас для «сьогодні») */
  const dayPropGetter = useCallback(
    (date: Date) => {
      const inMonth = isSameMonth(date, currentDate);
      const today = isToday(date);

      const className = [
        inMonth ? "" : "rbc-day-outside",
        today ? "hd-today" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return {
        className,
        style: inMonth ? { cursor: "pointer" } : { opacity: 0.35, pointerEvents: "none" as const },
        title: inMonth ? "Kliknij, aby dodać wydarzenie" : "Poza bieżącym miesiącem",
      };
    },
    [currentDate]
  );

  /* Заборона виділення слотів поза поточним місяцем */
  const onSelecting = useCallback(
    ({ start }: { start: Date }) => isSameMonth(start, currentDate),
    [currentDate]
  );

  /* Клік по дню */
  const handleSelectSlot = useCallback(
    ({ start }: { start: Date }) => {
      if (isSameMonth(start, currentDate)) onDayClick?.(toYMD(start));
    },
    [onDayClick, currentDate]
  );

  /* Клік по події */
  const handleSelectEvent = useCallback(
    (ev: CalendarEvent) => {
      const rid = ev.resource?.id;
      if (rid) onEventClick?.(String(rid));
    },
    [onEventClick]
  );

  /* Кастомні компоненти */
  const components = useMemo(
    () => ({
      event: ({ event, title }: { event: CalendarEvent; title: string }) => {
        const cat = event.resource?.category ?? "default";
        const label = cat === "birthday" ? "🎂" : cat === "work" ? "💼" : cat === "personal" ? "⭐" : "•";
        return (
          <span title="Kliknij, aby edytować">
            <span style={{ marginRight: 6 }}>{label}</span>
            {title}
          </span>
        );
      },
      toolbar: CalendarToolbar,
    }),
    []
  );

  /* Легенда */
  const Legend = () => (
    <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
      {[
        { key: "birthday", label: "Urodziny" },
        { key: "work", label: "Praca" },
        { key: "personal", label: "Osobiste" },
      ].map(({ key, label }) => {
        const c = CATEGORY_STYLES[key] ?? CATEGORY_STYLES.default;
        return (
          <span
            key={key}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1"
            style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "999px",
                background: c.text,
                display: "inline-block",
              }}
            />
            {label}
          </span>
        );
      })}
      <span className="text-slate-500 ml-auto text-xs">
        Podpowiedź: kliknij w dzień, aby dodać; kliknij w wydarzenie, aby edytować.
      </span>
    </div>
  );

  /* Верстка контейнерів */
  return (
    <div className="bg-white rounded-2xl shadow p-4 flex flex-col h-[80vh]">
      <Legend />
      {/* Внутрішній кліпер для календаря */}
      <div className="flex-1 rounded-xl overflow-hidden border border-slate-200">
        <Calendar
          localizer={LOCALIZER}
          events={events}
          view={view}
          onView={handleView}
          date={currentDate}
          onNavigate={handleNavigate}
          selectable
          onSelecting={onSelecting}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          startAccessor="start"
          endAccessor="end"
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          defaultView={Views.MONTH}
          popup
          messages={messages}
          formats={formats}
          eventPropGetter={eventPropGetter}
          dayPropGetter={dayPropGetter}
          longPressThreshold={200}
          components={components}
          style={{ height: "100%", width: "100%" }}
        />
      </div>
    </div>
  );
}
