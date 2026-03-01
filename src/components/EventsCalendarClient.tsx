"use client";

import EventsCalendar, {
  type EventRow,
} from "./EventsCalendar";

type Props = {
  items: EventRow[];
  onDayClick?: (dateYMD: string) => void;
  onEventClick?: (eventId: string) => void;
};

export default function EventsCalendarClient(props: Props) {
  return <EventsCalendar {...props} />;
}