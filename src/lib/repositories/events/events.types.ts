export interface EventSummary {
  id: string;
  title: string;
  date: Date;
  category?: string;
  notes?: string;
}

export type EventRecurrenceRule = "none" | "weekly" | "monthly" | "yearly";

export interface CalendarEventRecord {
  id: string;
  title: string;
  date: string;
  notes: string | null;
  category: string | null;
  personId: string | null;
  personName: string | null;
  isImportant: boolean;
  recurrenceRule: EventRecurrenceRule;
}

export interface CreateCalendarEventInput {
  userId: string;
  title: string;
  date: string;
  notes?: string | null;
  category?: string | null;
  personId?: string | null;
  personName?: string | null;
  isImportant?: boolean;
  recurrenceRule?: EventRecurrenceRule;
}

export interface UpdateCalendarEventInput {
  userId: string;
  eventId: string;
  title: string;
  date: string;
  notes?: string | null;
  category?: string | null;
  personId?: string | null;
  personName?: string | null;
  isImportant?: boolean;
  recurrenceRule?: EventRecurrenceRule;
}

export interface EnsureBirthdayOccurrenceInput {
  personId: string;
  personName: string;
  occurrenceDate: string;
}
