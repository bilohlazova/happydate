// src/lib/repositories/person.types.ts

export type PersonGender = "female" | "male" | "other" | "unspecified";
export type PersonRelationCategory =
  | "partner"
  | "close_family"
  | "children"
  | "friends"
  | "work"
  | "acquaintances"
  | "neighbors"
  | "clients"
  | "family"
  | "other";

export interface PersonRow {
  id: string;
  user_id: string;

  name: string;

  relationship: string | null;

  relation_label: string | null;

  relation_category: PersonRelationCategory | null;

  birthday: string | null;

  notes: string | null;

  phone: string | null;

  email: string | null;

  external_contact_id: string | null;

  contact_source: string | null;

  gender: PersonGender;

  created_at: string;
}
