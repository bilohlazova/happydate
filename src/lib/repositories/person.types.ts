// src/lib/repositories/person.types.ts

export interface PersonRow {
  id: string;
  user_id: string;

  name: string;

  relationship: string | null;

  birthday: string | null;

  notes: string | null;

  phone: string | null;

  email: string | null;

  external_contact_id: string | null;

  contact_source: string | null;

  created_at: string;
}
