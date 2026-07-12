// src/lib/repositories/personRepository.ts
// ─────────────────────────────────────────────────────────────────────────────
// Data Layer for People.
// Read and write access to the `public.people` table.
// No business logic.
// Higher layers decide how data is used.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "@/lib/supabaseClient";
import type {
  PersonGender,
  PersonRelationCategory,
  PersonRelationKey,
  PersonRow,
} from "./person.types";

export interface CreatePersonInput {
  userId: string;
  name: string;
  relationship?: string;
  relationLabel?: string;
  relationKey?: PersonRelationKey | null;
  relationCategory?: PersonRelationCategory | null;
  birthday?: string;
  phone?: string;
  email?: string;
  externalContactId?: string;
  contactSource?: "manual" | "contacts" | "card" | "link" | "qr" | "invite";
  gender?: PersonGender;
}

export interface UpdatePersonInput {
  personId: string;
  name: string;
  relationship?: string;
  relationLabel?: string;
  relationKey?: PersonRelationKey | null;
  relationCategory?: PersonRelationCategory | null;
  birthday?: string;
  gender?: PersonGender;
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
 * Fetch a single person by id.
 */
export async function getPersonById(
  personId: string
): Promise<PersonRow | null> {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("id", personId)
    .returns<PersonRow[]>()
    .maybeSingle();

  if (error) {
    throw new Error(
      `[personRepository] getPersonById failed: ${error.message}`
    );
  }

  return data;
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
      relation_label: input.relationLabel ?? input.relationship ?? null,
      relation_key: input.relationKey ?? null,
      relation_category: input.relationCategory ?? null,
      birthday: input.birthday ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      external_contact_id: input.externalContactId ?? null,
      contact_source: input.contactSource ?? "manual",
      gender: input.gender ?? "unspecified",
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

export async function updatePerson(
  input: UpdatePersonInput
): Promise<PersonRow> {
  const { data, error } = await supabase
    .from("people")
    .update({
      name: input.name,
      relationship: input.relationship ?? null,
      relation_label: input.relationLabel ?? input.relationship ?? null,
      relation_key: input.relationKey ?? null,
      relation_category: input.relationCategory ?? null,
      birthday: input.birthday ?? null,
      gender: input.gender ?? "unspecified",
    })
    .eq("id", input.personId)
    .select()
    .returns<PersonRow[]>()
    .single();

  if (error) {
    throw new Error(
      `[personRepository] updatePerson failed: ${error.message}`
    );
  }

  return data;
}

export async function deletePerson(personId: string): Promise<void> {
  const { error } = await supabase.from("people").delete().eq("id", personId);

  if (error) {
    throw new Error(
      `[personRepository] deletePerson failed: ${error.message}`
    );
  }
}
