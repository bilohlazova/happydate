// src/lib/repositories/person.types.ts

export interface PersonRow {
  id: string;
  user_id: string;

  name: string;

  relationship: string | null;

  birthday: string | null;

  notes: string | null;

  created_at: string;
}