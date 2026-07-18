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
import { de, enUS, pl, ru, uk } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
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

const DATE_LOCALES = { pl, uk, en: enUS, ru, de } as const;

/* ================= CATEGORY STYLES ================= */

const CATEGORY_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  birthday: { bg: "#fce7f3", text: "#9d174d", border: "#fbcfe8" },
  work: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  personal: { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" },
  default: { bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd" },
};

/* ================= COMPONENTS MAP ================= */

const CALENDAR_COMPONENTS = {
  toolbar: CalendarToolbar,
} as const;

/* ================= HELPERS ================= */

function toYMD(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ================= MESSAGES & FORMATS ================= */

/* ================= INNER CLIENT COMPONENT ================= */
// Винесено в окремий компонент щоб уникнути помилки серіалізації props

function EventsCalendarInner({
  items,
  onDayClick,
  onEventClick,
}: EventsCalendarProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard.navigation");
  const dateLocale = DATE_LOCALES[locale as keyof typeof DATE_LOCALES] ?? pl;
  const localizer = useMemo(
    () =>
      dateFnsLocalizer({
        format,
        parse,
        startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
        getDay,
        locales: DATE_LOCALES,
      }),
    []
  );
  const messages = useMemo(
    () => ({
      next: "→",
      previous: "←",
      today: t("today"),
      month: t("month"),
      week: t("week"),
      day: t("day"),
      agenda: "Agenda",
      showMore: (count: number) => `+${count}`,
    }),
    [t]
  );
  const formats = useMemo(
    () => ({
      dayFormat: (date: Date) => format(date, "dd", { locale: dateLocale }),
      weekdayFormat: (date: Date) =>
        format(date, "EEE", { locale: dateLocale }).toUpperCase(),
      monthHeaderFormat: (date: Date) =>
        format(date, "LLLL yyyy", { locale: dateLocale }),
    }),
    [dateLocale]
  );
  const [view, setView] = useState<View>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const handleView = useCallback((v: View) => setView(v), []);
  const handleNavigate = useCallback((date: Date) => setCurrentDate(date), []);

  const events: CalendarEvent[] = useMemo(
    () =>
      (items || []).map((e) => {
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
      }),
    [items]
  );

  const handleDrillDown = useCallback(
    (date: Date) => {
      if (!isSameMonth(date, currentDate)) return;
      onDayClick?.(toYMD(date));
    },
    [currentDate, onDayClick]
  );

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      if (event.resource?.id) onEventClick?.(event.resource.id);
    },
    [onEventClick]
  );

  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const cat = event.resource?.category ?? "default";
    const c = CATEGORY_STYLES[cat] ?? CATEGORY_STYLES.default;
    return {
      style: {
        backgroundColor: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        borderRadius: "999px",
        fontWeight: 600,
        fontSize: "11px",
        padding: "1px 7px",
        boxShadow: "none",
        cursor: "pointer",
      },
    };
  }, []);

  const dayPropGetter = useCallback(
    (date: Date) => {
      const inMonth = isSameMonth(date, currentDate);
      const today = isToday(date);
      return {
        className: today ? "hd-today" : "",
        style: {
          cursor: inMonth ? "pointer" : "default",
          opacity: inMonth ? 1 : 0.35,
          pointerEvents: inMonth ? ("auto" as const) : ("none" as const),
          backgroundColor: today ? "rgba(14,165,233,0.06)" : undefined,
        },
      };
    },
    [currentDate]
  );

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(226,232,240,0.8)" }}
    >
      <div style={{ height: 380 }}>
        <Calendar
          localizer={localizer}
          events={events}
          view={view}
          onView={handleView}
          date={currentDate}
          onNavigate={handleNavigate}
          selectable="ignoreEvents"
          drilldownView={null}
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
          components={CALENDAR_COMPONENTS}
          style={{ height: "100%", width: "100%" }}
        />
      </div>
    </div>
  );
}

/* ================= EXPORT ================= */

export default function EventsCalendar(props: EventsCalendarProps) {
  return <EventsCalendarInner {...props} />;
}
