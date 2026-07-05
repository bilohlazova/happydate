import { supabase } from "@/lib/supabaseClient";
import type { PersonSummary } from "./people.types";

type PeopleTableRow = {
  id: string;
  user_id: string;
  name: string;
  birthday: string | null;
  relationship: string | null;
  notes: string | null;
  created_at: string | null;
};

export async function getPeople(): Promise<PersonSummary[]> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("[people.repository] getUser failed:", userError);
      return [];
    }

    if (!user) {
      console.error("[people.repository] getPeople called without a session");
      return [];
    }

    const { data, error } = await supabase
      .from("people")
      .select("id, user_id, name, birthday, relationship, notes, created_at")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      console.error("[people.repository] getPeople failed:", error);
      return [];
    }

    return ((data ?? []) as PeopleTableRow[]).map((row) => ({
      id: row.id,
      firstName: row.name,
      birthday: row.birthday ? new Date(row.birthday) : undefined,
      relationship: row.relationship ?? undefined,
      favoriteThings: [],
      lastContactAt: undefined,
    }));
  } catch (error) {
    console.error("[people.repository] getPeople unexpected failure:", error);
    return [];
  }
}
