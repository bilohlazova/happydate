export interface PersonRow {
  id: string;
  user_id: string;

  name: string;

  relationship: string | null;

  birthday: string | null;

  avatar_url: string | null;

  created_at: string;
}