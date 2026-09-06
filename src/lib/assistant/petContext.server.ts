import { createClient } from "@supabase/supabase-js";

export const ASSISTANT_PET_LIMIT = 8;

export type AssistantPetContext = {
  name: string;
  species: string;
  breed: string | null;
  note: string | null;
};

function bounded(value: unknown, limit: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, limit) : null;
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}

/** Owner-scoped, bounded pet facts for one verified active person. */
export async function loadAssistantPetContext({ userId, personId }: { userId: string; personId: string }): Promise<AssistantPetContext[]> {
  const client = adminClient();
  const { data: links, error: linkError } = await client.from("person_pets")
    .select("pet_id").eq("user_id", userId).eq("person_id", personId).limit(ASSISTANT_PET_LIMIT);
  if (linkError || !links?.length) return [];
  const { data, error } = await client.from("pets")
    .select("name, species, breed, note").eq("user_id", userId)
    .in("id", links.map((link) => link.pet_id)).order("name").limit(ASSISTANT_PET_LIMIT);
  if (error) return [];
  return (data ?? []).flatMap((row) => {
    const name = bounded(row.name, 120);
    const species = bounded(row.species, 80);
    if (!name || !species) return [];
    return [{ name, species, breed: bounded(row.breed, 120), note: bounded(row.note, 500) }];
  });
}
