import { supabase } from "@/lib/supabaseClient";
import { GENTLE_INSPIRATION_DISCLAIMER } from "@/lib/memory-engine/types";

export type PersonSymbolKind = "preset" | "happy" | "drawing" | "upload";
export interface PersonSymbolRow {
  id: string; user_id: string; person_id: string; kind: PersonSymbolKind;
  name: string | null; preset_key: string | null; image_path: string | null;
  image_url: string | null; description: string | null; prompt: string | null;
  user_meaning: string | null; happy_interpretation: string | null;
  interpretation_disclaimer_version: string | null;
  created_at: string; updated_at: string;
}

const COLUMNS = "id,user_id,person_id,kind,name,preset_key,image_path,description,prompt,user_meaning,happy_interpretation,interpretation_disclaimer_version,created_at,updated_at";

export async function getPersonSymbol(userId: string, personId: string): Promise<PersonSymbolRow | null> {
  const { data, error } = await supabase.from("person_symbols").select(COLUMNS)
    .eq("user_id", userId).eq("person_id", personId).maybeSingle();
  if (error) throw new Error(`[personSymbolRepository] load failed: ${error.message}`);
  if (!data) return null;
  let imageUrl: string | null = null;
  if (data.image_path) {
    const signed = await supabase.storage.from("person-symbols").createSignedUrl(data.image_path, 3600);
    imageUrl = signed.error ? null : signed.data.signedUrl;
  }
  return { ...data, image_url: imageUrl } as PersonSymbolRow;
}

export async function savePersonSymbol(input: {
  userId: string; personId: string; kind: PersonSymbolKind; name?: string;
  presetKey?: string; image?: Blob; prompt?: string;
}): Promise<void> {
  const current = await getPersonSymbol(input.userId, input.personId);
  let imagePath: string | null = null;
  if (input.image) {
    imagePath = `${input.userId}/${input.personId}/${crypto.randomUUID()}.png`;
    const uploaded = await supabase.storage.from("person-symbols").upload(imagePath, input.image, {
      contentType: input.image.type || "image/png", upsert: false,
    });
    if (uploaded.error) throw new Error(`[personSymbolRepository] upload failed: ${uploaded.error.message}`);
  } else if (input.kind === "drawing" || input.kind === "upload") {
    imagePath = current?.image_path ?? null;
  }
  const { error } = await supabase.from("person_symbols").upsert({
    user_id: input.userId, person_id: input.personId, kind: input.kind,
    name: input.name?.trim() || current?.name || null,
    preset_key: input.kind === "preset" || input.kind === "happy" ? input.presetKey ?? null : null,
    image_path: imagePath,
    prompt: input.prompt?.trim() || null,
    user_meaning: current?.user_meaning ?? null,
    happy_interpretation: current?.happy_interpretation ?? null,
    interpretation_disclaimer_version: current?.interpretation_disclaimer_version ?? null,
    description: current?.description ?? null,
  }, { onConflict: "person_id" });
  if (error) {
    if (imagePath && imagePath !== current?.image_path) await supabase.storage.from("person-symbols").remove([imagePath]);
    throw new Error(`[personSymbolRepository] save failed: ${error.message}`);
  }
  if (current?.image_path && imagePath && current.image_path !== imagePath) {
    await supabase.storage.from("person-symbols").remove([current.image_path]);
  }
}

export async function deletePersonSymbol(userId: string, personId: string): Promise<void> {
  const current = await getPersonSymbol(userId, personId);
  const { error } = await supabase.from("person_symbols").delete().eq("user_id", userId).eq("person_id", personId);
  if (error) throw new Error(`[personSymbolRepository] delete failed: ${error.message}`);
  if (current?.image_path) await supabase.storage.from("person-symbols").remove([current.image_path]);
}

export async function updatePersonSymbolMeaning(userId: string, personId: string, userMeaning: string): Promise<void> {
  const { error } = await supabase.from("person_symbols").update({ user_meaning: userMeaning.trim() || null })
    .eq("user_id", userId).eq("person_id", personId);
  if (error) throw new Error(`[personSymbolRepository] meaning failed: ${error.message}`);
}

export async function updatePersonSymbolInterpretation(userId: string, personId: string, interpretation: string | null): Promise<void> {
  const text = interpretation?.trim() || null;
  const { error } = await supabase.from("person_symbols").update({
    happy_interpretation: text,
    interpretation_disclaimer_version: text ? GENTLE_INSPIRATION_DISCLAIMER : null,
  }).eq("user_id", userId).eq("person_id", personId);
  if (error) throw new Error(`[personSymbolRepository] interpretation failed: ${error.message}`);
}
