import { supabase } from "@/lib/supabaseClient";
import type { EventSummary } from "./events.types";

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
