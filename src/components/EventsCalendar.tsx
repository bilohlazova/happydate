"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  Event as RBCEvent,
  Views,
  type View,
} from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  isSameMonth,
  isToday,
} from "date-fns";
import { pl } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import CalendarToolbar from "./CalendarToolbar";

/* ================= TYPES ================= */

export type EventRow = {
  id: string;
  title: string;
  date: string;
  notes?: string | null;
  category?: string | null;
};

type CalendarEvent = RBCEvent & {
  resource?: {
    id: string;
    notes?: string | null;
    category?: string | null;
  };
};

type EventsCalendarProps = {
  items: EventRow[];
  onDayClick?: (dateYMD: string) => void;
  onEventClick?: (eventId: string) => void;
};

/* ================= LOCALIZER ================= */

const LOCALIZER = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { pl },
});

/* ================= STYLES ================= */

const CATEGORY_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  birthday: { bg: "#ffe4f1", text: "#9b1b57", border: "#f9c2db" },
  work: { bg: "#fff4e0", text: "#7a4a00", border: "#ffd9a8" },
  personal: { bg: "#e9fff3", text: "#11663c", border: "#baf3d3" },
  default: { bg: "#eef2f7", text: "#1f2937", border: "#d1d5db" },
};

function toYMD(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ================= COMPONENT ================= */

export default function EventsCalendar({
  items,
  onDayClick,
  onEventClick,
}: EventsCalendarProps) {
  const [view, setView] = useState<View>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const handleView = useCallback((v: View) => setView(v), []);
  const handleNavigate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  /* ===== Map events ===== */

  const events: CalendarEvent[] = useMemo(() => {
    return (items || []).map((e) => {
      const start = new Date(`${e.date}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

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
    });
  }, [items]);

  /* ===== Click on date (NO Day view switch) ===== */

  const handleDrillDown = useCallback(
    (date: Date) => {
      if (!isSameMonth(date, currentDate)) return;
      onDayClick?.(toYMD(date));
    },
    [currentDate, onDayClick]
  );

  /* ===== Click on event ===== */

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      if (event.resource?.id) {
        onEventClick?.(event.resource.id);
      }
    },
    [onEventClick]
  );

  /* ===== Event styling ===== */

  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const cat = event.resource?.category ?? "default";
    const c = CATEGORY_STYLES[cat] ?? CATEGORY_STYLES.default;

    return {
      style: {
        backgroundColor: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        borderRadius: "6px",
        fontWeight: 600,
        padding: "2px 6px",
      },
    };
  }, []);

  /* ===== Day styling ===== */

  const dayPropGetter = useCallback(
    (date: Date) => {
      const inMonth = isSameMonth(date, currentDate);
      const today = isToday(date);

      return {
        className: today ? "hd-today" : "",
        style: inMonth
          ? { cursor: "pointer" }
          : { opacity: 0.3, pointerEvents: "none" as const },
      };
    },
    [currentDate]
  );

  const messages = {
    next: "Następny",
    previous: "Poprzedni",
    today: "Dziś",
    month: "Miesiąc",
    week: "Tydzień",
    day: "Dzień",
    agenda: "Agenda",
    showMore: (count: number) => `+${count} więcej`,
  };

  const formats = {
    dayFormat: (date: Date) => format(date, "dd", { locale: pl }),
    weekdayFormat: (date: Date) => format(date, "EEE", { locale: pl }),
    monthHeaderFormat: (date: Date) =>
      format(date, "LLLL yyyy", { locale: pl }),
  };

  return (
    <div className="bg-white rounded-2xl shadow p-4 flex flex-col h-[80vh]">
      <div className="flex-1 rounded-xl overflow-hidden border border-slate-200">
        <Calendar
          localizer={LOCALIZER}
          events={events}
          view={view}
          onView={handleView}
          date={currentDate}
          onNavigate={handleNavigate}
          selectable="ignoreEvents"
          drilldownView={null} // 🚫 блокуємо перехід у Day view
          onDrillDown={handleDrillDown}
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
          components={{ toolbar: CalendarToolbar }}
          style={{ height: "100%", width: "100%" }}
        />
      </div>
    </div>
  );
}