import { supabase } from "@/lib/supabaseClient";
import type {
  HomeDataError,
  HomeDataSection,
  HomeMemory,
  HomePerson,
  HomeProfile,
  HomeRepositoryData,
  HomeStoredEvent,
} from "@/lib/home/home.types";

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
    .select("id, name, birthday, relationship, relation_label, gender")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  if (error) throw new HomeRepositoryError("people", error.message);
  return (data ?? []).map((person) => ({
    id: person.id,
    name: person.name,
    birthday: person.birthday ?? null,
    relationLabel: person.relation_label ?? person.relationship ?? null,
    gender: person.gender === "female" || person.gender === "male" || person.gender === "other" || person.gender === "unspecified"
      ? person.gender
      : null,
  }));
}

async function loadEvents(userId: string): Promise<HomeStoredEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, date, category, notes")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (error) throw new HomeRepositoryError("events", error.message);
  return (data ?? []) as HomeStoredEvent[];
}

async function loadMemories(userId: string): Promise<HomeMemory[]> {
  const { data, error } = await supabase
    .from("memories")
    .select("id, person_id, event_id, type, title, value_text, content_text, occurred_on, created_at, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw new HomeRepositoryError("memories", error.message);
  return (data ?? []).map((memory) => ({
    id: memory.id,
    personId: memory.person_id,
    eventId: memory.event_id,
    type: memory.type,
    title: memory.title,
    value: memory.value_text,
    content: memory.content_text,
    occurredOn: memory.occurred_on,
    createdAt: memory.created_at,
    isActive: memory.is_active === true,
  }));
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

export async function getHomeData(): Promise<HomeRepositoryData> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    const missingSession = authError?.message.toLowerCase().includes("session missing");
    if (authError && !missingSession) {
      throw new Error(`[home.repository] Authentication failed: ${authError.message}`);
    }
    return {
      isAuthenticated: false,
      profile: null,
      authMetadataName: null,
      email: null,
      people: [],
      events: [],
      memories: [],
      errors: [],
    };
  }

  const [profileResult, peopleResult, eventsResult, memoriesResult] = await Promise.all([
    loadProfile(user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
    loadPeople(user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
    loadEvents(user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
    loadMemories(user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
  ]);

  const errors: HomeDataError[] = [];
  if (!profileResult.ok) errors.push(errorFrom(profileResult.reason, "profile"));
  if (!peopleResult.ok) errors.push(errorFrom(peopleResult.reason, "people"));
  if (!eventsResult.ok) errors.push(errorFrom(eventsResult.reason, "events"));
  if (!memoriesResult.ok) errors.push(errorFrom(memoriesResult.reason, "memories"));

  return {
    isAuthenticated: true,
    profile: profileResult.ok ? profileResult.value : null,
    authMetadataName:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null,
    email: user.email ?? null,
    people: peopleResult.ok ? peopleResult.value : [],
    events: eventsResult.ok ? eventsResult.value : [],
    memories: memoriesResult.ok ? memoriesResult.value : [],
    errors,
  };
}
