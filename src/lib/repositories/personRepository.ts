// src/lib/repositories/personRepository.ts
// ─────────────────────────────────────────────────────────────────────────────
// Data Layer for People.
// Read and write access to the `public.people` table.
// No business logic.
// Higher layers decide how data is used.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "@/lib/supabaseClient";
import type { PersonRow } from "./person.types";

export interface CreatePersonInput {
  userId: string;
  name: string;
  relationship?: string;
  birthday?: string;
}

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

/**
 * Creates a new person.
 * Pure write operation with no business logic.
 */
export async function createPerson(
  input: CreatePersonInput
): Promise<PersonRow> {
  const { data, error } = await supabase
    .from("people")
    .insert({
      user_id: input.userId,
      name: input.name,
      relationship: input.relationship ?? null,
      birthday: input.birthday ?? null,
    })
    .select()
    .returns<PersonRow[]>()
    .single();

  if (error) {
    throw new Error(
      `[personRepository] createPerson failed: ${error.message}`
    );
  }

  return data;
}