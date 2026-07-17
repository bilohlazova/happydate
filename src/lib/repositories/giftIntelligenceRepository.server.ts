import { createClient } from "@supabase/supabase-js";
import { mapLegacyMemoriesToKnowledge, type KnowledgeItem } from "@/lib/knowledge";
import { MEMORY_ROW_COLUMNS, type MemoryRow } from "./memory.types";

export interface OwnedGiftPerson {
  id: string;
  userId: string;
  name: string | null;
  relation: string | null;
}

export interface GiftIntelligenceSource {
  person: OwnedGiftPerson;
  knowledge: KnowledgeItem[];
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function findOwnedGiftPerson(
  userId: string,
  personId: string,
): Promise<OwnedGiftPerson | null> {
  const { data } = await adminClient()
    .from("people")
    .select("id, user_id, name, relation")
    .eq("id", personId)
    .eq("user_id", userId)
    .maybeSingle();
  return data ? {
    id: data.id,
    userId: data.user_id,
    name: data.name ?? null,
    relation: data.relation ?? null,
  } : null;
}

export async function getCachedGiftIdeas(person: OwnedGiftPerson, occasion: string) {
  const { data, error } = await adminClient()
    .from("ai_gift_cache")
    .select("ideas")
    .eq("person_id", person.id)
    .eq("occasion", occasion)
    .maybeSingle();
  return !error && data?.ideas ? data.ideas : null;
}

export async function loadGiftIntelligenceSource(
  person: OwnedGiftPerson,
): Promise<GiftIntelligenceSource> {
  const client = adminClient();
  const memoryResult = await client
    .from("memories")
    .select(MEMORY_ROW_COLUMNS)
    .eq("user_id", person.userId)
    .eq("person_id", person.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .returns<MemoryRow[]>();
  if (memoryResult.error) {
    throw new Error(`[giftIntelligenceRepository] knowledge read failed: ${memoryResult.error.message}`);
  }
  const knowledge = mapLegacyMemoriesToKnowledge(memoryResult.data ?? []);

  return {
    person,
    knowledge,
  };
}

/** Compatibility fallback until the legacy Notes table is inventoried. */
export async function loadLegacyGiftNotes(person: OwnedGiftPerson): Promise<string[]> {
  const { data } = await adminClient()
    .from("notes")
    .select("content")
    .eq("user_id", person.userId)
    .eq("person_id", person.id)
    .order("created_at", { ascending: false });
  return (data ?? [])
    .map((note) => typeof note.content === "string" ? note.content : "")
    .filter(Boolean);
}

export async function saveGiftIdeas(
  person: OwnedGiftPerson,
  occasion: string,
  ideas: unknown,
): Promise<void> {
  await adminClient().from("ai_gift_cache").upsert(
    { person_id: person.id, occasion, ideas, created_at: new Date().toISOString() },
    { onConflict: "person_id,occasion" },
  );
}
