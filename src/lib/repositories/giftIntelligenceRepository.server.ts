import { createClient } from "@supabase/supabase-js";
import type { KnowledgeItem } from "@/lib/knowledge";
import { listKnowledgeForOwnedPersonOnServer } from "./knowledgeRepository";
import type {
  PersonGender,
  PersonRelationKey,
} from "./person.types";

export interface OwnedGiftPerson {
  id: string;
  userId: string;
  name: string | null;
  relation: string | null;
  relationKey: PersonRelationKey | null;
  gender: PersonGender;
  birthday: string | null;
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
    .select("id, user_id, name, relation, relation_key, gender, birthday")
    .eq("id", personId)
    .eq("user_id", userId)
    .maybeSingle();
  return data ? {
    id: data.id,
    userId: data.user_id,
    name: data.name ?? null,
    relation: data.relation ?? null,
    relationKey: data.relation_key ?? null,
    gender: data.gender ?? "unspecified",
    birthday: data.birthday ?? null,
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
  return {
    person,
    knowledge: await listKnowledgeForOwnedPersonOnServer({
      userId: person.userId,
      personId: person.id,
    }),
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
