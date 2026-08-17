import { supabase } from "@/lib/supabaseClient";
import { logOperationalError } from "@/lib/observability/safeLogger";
import type {
  CalendarEventRecord,
  CreateCalendarEventInput,
  EnsureBirthdayOccurrenceInput,
  EventSummary,
  UpdateCalendarEventInput,
} from "./events.types";

type EventsTableRow = {
  id: string;
  user_id: string;
  title: string;
  date: string;
  time_of_day: string | null;
  duration_minutes: number | null;
  location: string | null;
  travel_buffer_minutes: number | null;
  notes: string | null;
  category: string | null;
};

const CALENDAR_EVENT_COLUMNS = "id,title,date,time_of_day,duration_minutes,location,travel_buffer_minutes,notes,category,person_id,person_name,is_important,recurrence_rule";

export class CalendarEventRepositoryError extends Error {
  readonly operation: "list" | "create" | "update" | "delete" | "import";
  readonly cause?: unknown;

  constructor(operation: CalendarEventRepositoryError["operation"], cause?: unknown) {
    super(`calendar_event_${operation}_failed`);
    this.operation = operation;
    this.cause = cause;
  }
}

function normalizeCalendarEvent(row: unknown): CalendarEventRecord {
  const value = row as Partial<CalendarEventRecord>;
  if (typeof value.id !== "string" || typeof value.title !== "string" || typeof value.date !== "string") {
    throw new CalendarEventRepositoryError("list", new Error("Invalid event row"));
  }
  const recurrenceValue = (value as { recurrence_rule?: unknown }).recurrence_rule ?? value.recurrenceRule;
  const recurrenceRule: CalendarEventRecord["recurrenceRule"] = ["weekly", "monthly", "yearly"].includes(String(recurrenceValue))
    ? recurrenceValue as CalendarEventRecord["recurrenceRule"]
    : "none";
  return {
    id: value.id,
    title: value.title,
    date: value.date,
    timeOfDay: typeof (value as { time_of_day?: unknown }).time_of_day === "string"
      ? (value as { time_of_day: string }).time_of_day.slice(0, 5)
      : typeof value.timeOfDay === "string" ? value.timeOfDay.slice(0, 5) : null,
    durationMinutes: Number.isInteger((value as { duration_minutes?: unknown }).duration_minutes)
      ? (value as { duration_minutes: number }).duration_minutes
      : Number.isInteger(value.durationMinutes) ? value.durationMinutes ?? null : null,
    location: typeof value.location === "string" ? value.location : null,
    travelBufferMinutes: Number.isInteger((value as { travel_buffer_minutes?: unknown }).travel_buffer_minutes)
      ? (value as { travel_buffer_minutes: number }).travel_buffer_minutes
      : Number.isInteger(value.travelBufferMinutes) ? value.travelBufferMinutes ?? null : null,
    notes: typeof value.notes === "string" ? value.notes : null,
    category: typeof value.category === "string" ? value.category : null,
    personId: typeof (value as { person_id?: unknown }).person_id === "string"
      ? (value as { person_id: string }).person_id
      : typeof value.personId === "string" ? value.personId : null,
    personName: typeof (value as { person_name?: unknown }).person_name === "string"
      ? (value as { person_name: string }).person_name
      : typeof value.personName === "string" ? value.personName : null,
    isImportant: (value as { is_important?: unknown }).is_important === true || value.isImportant === true,
    recurrenceRule,
  };
}

export async function listCalendarEvents(userId: string): Promise<CalendarEventRecord[]> {
  const { data, error } = await supabase
    .from("events")
    .select(CALENDAR_EVENT_COLUMNS)
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (error) throw new CalendarEventRepositoryError("list", error);
  return (data ?? []).map(normalizeCalendarEvent);
}

export async function createCalendarEvent(input: CreateCalendarEventInput): Promise<CalendarEventRecord> {
  const { data, error } = await supabase
    .from("events")
    .insert({ user_id: input.userId, title: input.title, date: input.date, time_of_day: input.timeOfDay ?? null, duration_minutes: input.durationMinutes ?? null, location: input.location ?? null, travel_buffer_minutes: input.travelBufferMinutes ?? null, notes: input.notes ?? null, category: input.category ?? null, person_id: input.personId ?? null, person_name: input.personName ?? null, is_important: input.isImportant ?? false, recurrence_rule: input.recurrenceRule ?? "none" })
    .select(CALENDAR_EVENT_COLUMNS)
    .single();
  if (error) throw new CalendarEventRepositoryError("create", error);
  return normalizeCalendarEvent(data);
}

export async function updateCalendarEvent(input: UpdateCalendarEventInput): Promise<CalendarEventRecord> {
  const { data, error } = await supabase
    .from("events")
    .update({ title: input.title, date: input.date, time_of_day: input.timeOfDay ?? null, duration_minutes: input.durationMinutes ?? null, location: input.location ?? null, travel_buffer_minutes: input.travelBufferMinutes ?? null, notes: input.notes ?? null, category: input.category ?? null, person_id: input.personId ?? null, person_name: input.personName ?? null, is_important: input.isImportant ?? false, recurrence_rule: input.recurrenceRule ?? "none" })
    .eq("id", input.eventId)
    .eq("user_id", input.userId)
    .select(CALENDAR_EVENT_COLUMNS)
    .single();
  if (error) throw new CalendarEventRepositoryError("update", error);
  return normalizeCalendarEvent(data);
}

export async function deleteCalendarEvent(userId: string, eventId: string): Promise<void> {
  const { error } = await supabase.from("events").delete().eq("id", eventId).eq("user_id", userId);
  if (error) throw new CalendarEventRepositoryError("delete", error);
}

export async function importCalendarEvents(
  userId: string,
  events: Array<Omit<CreateCalendarEventInput, "userId">>,
): Promise<CalendarEventRecord[]> {
  const { data, error } = await supabase
    .from("events")
    .insert(events.map((event) => ({
      user_id: userId,
      title: event.title,
      date: event.date,
      time_of_day: event.timeOfDay ?? null,
      duration_minutes: event.durationMinutes ?? null,
      location: event.location ?? null,
      travel_buffer_minutes: event.travelBufferMinutes ?? null,
      notes: event.notes ?? null,
      category: event.category ?? null,
      person_id: event.personId ?? null,
      person_name: event.personName ?? null,
      is_important: event.isImportant ?? false,
      recurrence_rule: event.recurrenceRule ?? "none",
    })))
    .select(CALENDAR_EVENT_COLUMNS);
  if (error) throw new CalendarEventRepositoryError("import", error);
  return (data ?? []).map(normalizeCalendarEvent);
}

export async function getEvents(): Promise<EventSummary[]> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      logOperationalError("events-repository", "get-user-failed", userError);
      return [];
    }

    if (!user) {
      logOperationalError("events-repository", "missing-session");
      return [];
    }

    const { data, error } = await supabase
      .from("events")
      .select("id, user_id, title, date, time_of_day, duration_minutes, location, travel_buffer_minutes, notes, category")
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    if (error) {
      logOperationalError("events-repository", "get-events-failed", error);
      return [];
    }

    return ((data ?? []) as EventsTableRow[]).map((row) => ({
      id: row.id,
      title: row.title,
      date: new Date(`${row.date}T00:00:00`),
      timeOfDay: row.time_of_day?.slice(0, 5) ?? undefined,
      durationMinutes: row.duration_minutes ?? undefined,
      location: row.location ?? undefined,
      travelBufferMinutes: row.travel_buffer_minutes ?? undefined,
      category: row.category ?? undefined,
      notes: row.notes ?? undefined,
    }));
  } catch (error) {
    logOperationalError("events-repository", "unexpected-failure", error);
    return [];
  }
}

export async function ensureBirthdayOccurrence({
  personId,
  personName,
  occurrenceDate,
}: EnsureBirthdayOccurrenceInput): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error(`[events.repository] Authentication failed: ${userError.message}`);
  if (!user) throw new Error("[events.repository] Authentication required");

  const title = `Birthday: ${personName.replace(/\s+/g, " ").trim()}`;
  const identity = {
    user_id: user.id,
    person_id: personId,
    date: occurrenceDate,
    category: "birthday",
  };
  const { data, error } = await supabase
    .from("events")
    .upsert({
      ...identity,
      title,
      person_name: personName,
      is_important: true,
    }, {
      onConflict: "user_id,person_id,date,category",
      ignoreDuplicates: true,
    })
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`[events.repository] Birthday occurrence failed: ${error.message}`);
  if (data && typeof data.id === "string") return data.id;

  const { data: existing, error: existingError } = await supabase
    .from("events")
    .select("id")
    .match(identity)
    .single();
  if (existingError) throw new Error(`[events.repository] Birthday occurrence reload failed: ${existingError.message}`);
  if (!existing || typeof existing.id !== "string") {
    throw new Error("[events.repository] Invalid birthday occurrence response");
  }
  return existing.id;
}
