// src/lib/repositories/personRepository.ts
// ─────────────────────────────────────────────────────────────────────────────
// Data Layer for People.
// Read-only access to the `public.people` table.
// No business logic.
// Higher layers decide how data is used.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "@/lib/supabaseClient";
import type { PersonRow } from "./person.types";

// TODO:
// Add create/update/delete operations once
// People management UI is introduced.

/**
 * Fetch all people belonging to a given user.
 * Ordered alphabetically by name.
 */
export async function getPeople(
  userId: string
): Promise<PersonRow[]> {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true })
    .returns<PersonRow[]>();

  if (error) {
    throw new Error(
      `[personRepository] getPeople failed: ${error.message}`
    );
  }

  return data ?? [];
}