import { supabase } from "@/lib/supabaseClient";

export interface PetRow {
  id: string;
  user_id: string;
  name: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  photo_url: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

const PET_SELECT = "id, user_id, name, species, breed, birth_date, photo_url, note, created_at, updated_at";

export async function getPetsForPerson(userId: string, personId: string): Promise<PetRow[]> {
  const { data: links, error: linkError } = await supabase
    .from("person_pets")
    .select("pet_id")
    .eq("user_id", userId)
    .eq("person_id", personId)
    .returns<Array<{ pet_id: string }>>();
  if (linkError) throw new Error(`[petRepository] get links failed: ${linkError.message}`);
  const petIds = (links ?? []).map((link) => link.pet_id);
  if (!petIds.length) return [];

  const { data, error } = await supabase
    .from("pets")
    .select(PET_SELECT)
    .eq("user_id", userId)
    .in("id", petIds)
    .order("name")
    .returns<PetRow[]>();
  if (error) throw new Error(`[petRepository] get pets failed: ${error.message}`);
  return data ?? [];
}

export async function createPetForPerson(input: {
  userId: string;
  personId: string;
  name: string;
  species: string;
  breed?: string;
  birthDate?: string;
  note?: string;
}): Promise<PetRow> {
  const { data: pet, error } = await supabase
    .from("pets")
    .insert({
      user_id: input.userId,
      name: input.name.trim(),
      species: input.species.trim(),
      breed: input.breed?.trim() || null,
      birth_date: input.birthDate || null,
      note: input.note?.trim() || null,
    })
    .select(PET_SELECT)
    .returns<PetRow[]>()
    .single();
  if (error) throw new Error(`[petRepository] create pet failed: ${error.message}`);

  const { error: linkError } = await supabase.from("person_pets").insert({
    user_id: input.userId,
    person_id: input.personId,
    pet_id: pet.id,
  });
  if (linkError) {
    await supabase.from("pets").delete().eq("id", pet.id).eq("user_id", input.userId);
    throw new Error(`[petRepository] link pet failed: ${linkError.message}`);
  }
  return pet;
}

export async function updatePet(input: {
  userId: string;
  petId: string;
  name: string;
  species: string;
  breed?: string;
  birthDate?: string;
  note?: string;
}): Promise<void> {
  const { error } = await supabase.from("pets").update({
    name: input.name.trim(),
    species: input.species.trim(),
    breed: input.breed?.trim() || null,
    birth_date: input.birthDate || null,
    note: input.note?.trim() || null,
  }).eq("id", input.petId).eq("user_id", input.userId);
  if (error) throw new Error(`[petRepository] update pet failed: ${error.message}`);
}

export async function unlinkPetFromPerson(userId: string, personId: string, petId: string): Promise<void> {
  const { error } = await supabase.from("person_pets").delete()
    .eq("user_id", userId).eq("person_id", personId).eq("pet_id", petId);
  if (error) throw new Error(`[petRepository] unlink pet failed: ${error.message}`);
}
