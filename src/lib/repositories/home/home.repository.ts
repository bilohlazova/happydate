import { supabase } from "@/lib/supabaseClient";
import { listKnowledge } from "@/lib/repositories/knowledgeRepository";
import { projectKnowledgeForHome } from "@/lib/knowledge";
import type { KnowledgeItem } from "@/lib/knowledge";
import type {
  HomeDataError,
  HomeDataSection,
  HomeMemory,
  HomePendingGiftOutcome,
  HomePerson,
  HomeProfile,
  HomeRepositoryData,
  HomeStoredEvent,
} from "@/lib/home/home.types";
import { canonicalRelationKey } from "@/lib/people/canonicalRelation";

export interface HomeRepositoryResult extends HomeRepositoryData {
  userId: string | null;
  knowledge: KnowledgeItem[];
}

class HomeRepositoryError extends Error {
  constructor(readonly section: HomeDataSection, message: string) {
    super(message);
  }
}

async function loadProfile(userId: string): Promise<HomeProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new HomeRepositoryError("profile", error.message);
  return data ? { fullName: data.full_name ?? null } : null;
}

async function loadPeople(userId: string): Promise<HomePerson[]> {
  const { data, error } = await supabase
    .from("people")
    .select("id, name, birthday, relationship, relation_label, relation_key, gender")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  if (error) throw new HomeRepositoryError("people", error.message);
  return (data ?? []).map((person) => ({
    id: person.id,
    name: person.name,
    birthday: person.birthday ?? null,
    relationLabel: person.relation_label ?? person.relationship ?? null,
    relationKey: canonicalRelationKey(
      person.relation_key,
      person.relation_label ?? person.relationship,
    ),
    gender: person.gender === "female" || person.gender === "male" || person.gender === "other" || person.gender === "unspecified"
      ? person.gender
      : null,
  }));
}

async function loadEvents(userId: string): Promise<HomeStoredEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, date, category, notes, person_id")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (error) throw new HomeRepositoryError("events", error.message);
  return (data ?? []).map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date,
    category: event.category ?? null,
    notes: event.notes ?? null,
    personId: event.person_id ?? null,
  }));
}

async function loadPendingGiftOutcomes(userId: string): Promise<HomePendingGiftOutcome[]> {
  const { data, error } = await supabase
    .from("gifts")
    .select("id, person_id, title, occurred_on")
    .eq("user_id", userId)
    .eq("lifecycle", "given")
    .is("recipient_reaction", null)
    .is("recipient_reaction_follow_up_dismissed_at", null)
    .or(`recipient_reaction_follow_up_snoozed_until.is.null,recipient_reaction_follow_up_snoozed_until.lte.${new Date().toISOString()}`)
    .not("person_id", "is", null)
    .order("occurred_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw new HomeRepositoryError("gifts", error.message);
  return (data ?? []).flatMap((gift) => gift.person_id && gift.title?.trim() ? [{
    id: gift.id,
    personId: gift.person_id,
    title: gift.title.trim(),
    givenAt: gift.occurred_on ?? null,
  }] : []);
}

async function loadKnowledge(userId: string): Promise<{
  knowledge: KnowledgeItem[];
  memories: HomeMemory[];
}> {
  try {
    const knowledge = await listKnowledge({ userId });
    return { knowledge, memories: projectKnowledgeForHome(knowledge) };
  } catch (error) {
    throw new HomeRepositoryError(
      "memories",
      error instanceof Error ? error.message : "Knowledge unavailable",
    );
  }
}

function errorFrom(reason: unknown, fallbackSection: HomeDataSection): HomeDataError {
  if (reason instanceof HomeRepositoryError) {
    return { section: reason.section, message: reason.message };
  }
  return {
    section: fallbackSection,
    message: reason instanceof Error ? reason.message : "Unknown Home data error",
  };
}

export async function getHomeRepositoryData(): Promise<HomeRepositoryResult> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    const missingSession = authError?.message.toLowerCase().includes("session missing");
    if (authError && !missingSession) {
      throw new Error(`[home.repository] Authentication failed: ${authError.message}`);
    }
    return {
      userId: null,
      isAuthenticated: false,
      profile: null,
      authMetadataName: null,
      email: null,
      people: [],
      events: [],
      memories: [],
      pendingGiftOutcomes: [],
      knowledge: [],
      errors: [],
    };
  }

  const [profileResult, peopleResult, eventsResult, knowledgeResult, giftsResult] = await Promise.all([
    loadProfile(user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
    loadPeople(user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
    loadEvents(user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
    loadKnowledge(user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
    loadPendingGiftOutcomes(user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
  ]);

  const errors: HomeDataError[] = [];
  if (!profileResult.ok) errors.push(errorFrom(profileResult.reason, "profile"));
  if (!peopleResult.ok) errors.push(errorFrom(peopleResult.reason, "people"));
  if (!eventsResult.ok) errors.push(errorFrom(eventsResult.reason, "events"));
  if (!knowledgeResult.ok) errors.push(errorFrom(knowledgeResult.reason, "memories"));
  if (!giftsResult.ok) errors.push(errorFrom(giftsResult.reason, "gifts"));

  return {
    userId: user.id,
    isAuthenticated: true,
    profile: profileResult.ok ? profileResult.value : null,
    authMetadataName:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null,
    email: user.email ?? null,
    people: peopleResult.ok ? peopleResult.value : [],
    events: eventsResult.ok ? eventsResult.value : [],
    memories: knowledgeResult.ok ? knowledgeResult.value.memories : [],
    pendingGiftOutcomes: giftsResult.ok ? giftsResult.value : [],
    knowledge: knowledgeResult.ok ? knowledgeResult.value.knowledge : [],
    errors,
  };
}
