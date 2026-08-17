export interface EventSummary {
  id: string;
  title: string;
  date: Date;
  timeOfDay?: string;
  durationMinutes?: number;
  location?: string;
  travelBufferMinutes?: number;
  category?: string;
  notes?: string;
}

export type EventRecurrenceRule = "none" | "weekly" | "monthly" | "yearly";

export interface CalendarEventRecord {
  id: string;
  title: string;
  date: string;
  timeOfDay: string | null;
  durationMinutes: number | null;
  location: string | null;
  travelBufferMinutes: number | null;
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
  timeOfDay?: string | null;
  durationMinutes?: number | null;
  location?: string | null;
  travelBufferMinutes?: number | null;
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
  timeOfDay?: string | null;
  durationMinutes?: number | null;
  location?: string | null;
  travelBufferMinutes?: number | null;
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
