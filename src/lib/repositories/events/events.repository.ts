import { supabase } from "@/lib/supabaseClient";
import type { EnsureBirthdayOccurrenceInput, EventSummary } from "./events.types";

type EventsTableRow = {
  id: string;
  user_id: string;
  title: string;
  date: string;
  notes: string | null;
  category: string | null;
};

export async function getEvents(): Promise<EventSummary[]> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("[events.repository] getUser failed:", userError);
      return [];
    }

    if (!user) {
      console.error("[events.repository] getEvents called without a session");
      return [];
    }

    const { data, error } = await supabase
      .from("events")
      .select("id, user_id, title, date, notes, category")
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    if (error) {
      console.error("[events.repository] getEvents failed:", error);
      return [];
    }

    return ((data ?? []) as EventsTableRow[]).map((row) => ({
      id: row.id,
      title: row.title,
      date: new Date(`${row.date}T00:00:00`),
      category: row.category ?? undefined,
      notes: row.notes ?? undefined,
    }));
  } catch (error) {
    console.error("[events.repository] getEvents unexpected failure:", error);
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
