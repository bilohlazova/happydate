import { supabase } from "@/lib/supabaseClient";
import { birthYearFromFullBirthday } from "@/lib/birthday/birthdayAge";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listKnowledgeWithClient } from "@/lib/repositories/knowledgeRepository";
import { projectKnowledgeForHome } from "@/lib/knowledge";
import type { KnowledgeItem } from "@/lib/knowledge";
import type {
  HomeDataError,
  HomeDataSection,
  HomeMemory,
  HomePendingGiftOutcome,
  HomeKnowledgeReviewPreferences,
  HomePerson,
  HomeProfile,
  HomeRepositoryData,
  HomeStoredEvent,
  HomeGiftHistoryRecord,
  HomeHappyAction,
  HomeHappyIdea,
} from "@/lib/home/home.types";
import { canonicalRelationKey } from "@/lib/people/canonicalRelation";
import { canonicalGiftEventContext } from "@/lib/gifts/giftEventContext";
import type { HappyTaskCardSource } from "@/lib/happy/task-ui/happyTaskCard";
import type { ProactivityMode } from "../../../../supabase/functions/happy-proactive/proactivity-policy.ts";
import { getOccasionDefinition } from "@/lib/occasions/occasionRegistry";
import { getUserOccasionsForLocalDay } from "@/lib/occasions/occasionResolver";
import { getSelectedOccasionPerson } from "@/lib/occasions/occasionPeople.repository";
import { resolveRelevantPeopleFromProjection } from "@/lib/occasions/occasionPeopleResolver";
import { toOccasionSignal, toRescueSignal } from "@/lib/happy/signals/happySignalAdapters";
import type { OccasionPersonProjection } from "@/lib/occasions/occasionPeople.types";
import type { OccasionSignal, RescueSignal } from "@/lib/happy/signals/happySignal.types";
import { getOccasionPreparationForUser } from "@/lib/occasions/occasionPreparation.server";
import { resolveOccasionRescueEligibility } from "@/lib/occasions/occasionRescue";
import { buildOccasionQuietKey, occasionCheckpointForPhase } from "../../../../supabase/functions/happy-proactive/proactivity-policy";

async function loadProactivityMode(client: SupabaseClient, userId: string): Promise<ProactivityMode> {
  const { data, error } = await client.from("happy_proactivity_preferences").select("mode").eq("user_id", userId).maybeSingle();
  if (error) return "balanced";
  return data?.mode === "minimal" || data?.mode === "active" ? data.mode : "balanced";
}

async function loadHappyTasks(client: SupabaseClient, userId: string): Promise<HappyTaskCardSource[]> {
  const { data, error } = await client.from("happy_tasks").select("id,user_id,type,status,person_id,event_id,context_snapshot,people!happy_tasks_person_id_fkey(name),events!happy_tasks_event_id_fkey(date),happy_task_steps(id,position,type,status,requires_approval)").eq("user_id", userId).in("status", ["active", "waiting_user", "paused"]).order("created_at", { ascending: true }).limit(10);
  if (error) throw new HomeRepositoryError("settings", error.message);
  return (data ?? []).map((task) => ({ id: task.id, userId: task.user_id, type: task.type, status: task.status, personId: task.person_id, eventId: task.event_id, contextSnapshot: task.context_snapshot, personName: (task.people as { name?: string } | null)?.name ?? null, eventDate: (task.events as { date?: string } | null)?.date ?? null, steps: (task.happy_task_steps ?? []).map((step) => ({ id: step.id, position: step.position, type: step.type, status: step.status, requiresApproval: step.requires_approval })) }));
}

async function loadHappyActions(client: SupabaseClient, userId: string): Promise<HomeHappyAction[]> {
  const { data, error } = await client.from("happy_actions").select("id,user_id,type,status,payload,created_at").eq("user_id", userId).eq("status", "pending").order("created_at", { ascending: true }).limit(5);
  if (error) throw new HomeRepositoryError("settings", error.message);
  return (data ?? []).flatMap((action) => typeof action.id === "string" && typeof action.user_id === "string" && typeof action.type === "string" && typeof action.status === "string" && typeof action.created_at === "string"
    ? [{ id: action.id, userId: action.user_id, type: action.type, status: action.status, createdAt: action.created_at, summary: action.type === "save_memory" && action.payload && typeof action.payload === "object" && typeof (action.payload as { content?: unknown }).content === "string" ? (action.payload as { content: string }).content.trim() : null }]
    : []);
}

async function loadHappyIdeas(client: SupabaseClient, userId: string): Promise<HomeHappyIdea[]> {
  const { data, error } = await client.from("happy_ideas").select("id,user_id,type,title,message,status,person_id,event_id,proactive_key,created_at").eq("user_id", userId).in("status", ["new", "shown"]).order("created_at", { ascending: true }).limit(10);
  if (error) throw new HomeRepositoryError("settings", error.message);
  return (data ?? []).flatMap((idea) => typeof idea.id === "string" && typeof idea.user_id === "string" && typeof idea.type === "string" && typeof idea.title === "string" && typeof idea.message === "string" && typeof idea.status === "string" && typeof idea.created_at === "string"
    ? [{ id: idea.id, userId: idea.user_id, type: idea.type, title: idea.title, message: idea.message, status: idea.status, personId: typeof idea.person_id === "string" ? idea.person_id : null, eventId: typeof idea.event_id === "string" ? idea.event_id : null, proactiveKey: typeof idea.proactive_key === "string" ? idea.proactive_key : null, createdAt: idea.created_at }]
    : []);
}

async function loadHappyOccasionSignals(
  client: SupabaseClient,
  userId: string,
  people: readonly HomePerson[],
  now: Date,
): Promise<{ occasions: OccasionSignal[]; rescues: RescueSignal[] }> {
  const occurrences = await getUserOccasionsForLocalDay({ client, userId, now });
  const quietKeys = occurrences.flatMap((occurrence) => {
    const checkpoint = occasionCheckpointForPhase(occurrence.phase);
    return checkpoint ? [buildOccasionQuietKey({ occurrenceKey: occurrence.occurrenceKey, personId: null, checkpoint })] : [];
  });
  const { data: quietRows, error: quietError } = quietKeys.length > 0
    ? await client.from("happy_proactive_quiet").select("quiet_key").eq("user_id", userId).in("quiet_key", quietKeys)
    : { data: [], error: null };
  if (quietError) throw new HomeRepositoryError("settings", quietError.message);
  const quietSet = new Set((quietRows ?? []).flatMap((row) => typeof row.quiet_key === "string" ? [row.quiet_key] : []));
  const projections: OccasionPersonProjection[] = people.map((person) => ({
    id: person.id,
    userId,
    name: person.name,
    relationKey: person.relationKey,
    gender: person.gender === "unspecified" ? null : person.gender,
  }));
  const signals: OccasionSignal[] = [];
  const rescues: RescueSignal[] = [];
  for (const occurrence of occurrences) {
    const definition = getOccasionDefinition(occurrence.occasionKey);
    if (!definition) continue;
    const selectedPersonId = await getSelectedOccasionPerson({ client, userId, occurrenceKey: occurrence.occurrenceKey });
    const peopleResolution = selectedPersonId
      ? { kind: "resolved" as const, occasionKey: occurrence.occasionKey, occurrenceKey: occurrence.occurrenceKey, personId: selectedPersonId }
      : resolveRelevantPeopleFromProjection({ definition, occurrenceKey: occurrence.occurrenceKey, people: projections });
    const preparation = peopleResolution.kind === "resolved"
      ? await getOccasionPreparationForUser({ client, userId, occurrenceKey: occurrence.occurrenceKey, now })
      : null;
    const readiness = preparation?.kind === "resolved" ? preparation.readiness : undefined;
    const checkpoint = occasionCheckpointForPhase(occurrence.phase);
    const personQuietKey = checkpoint && peopleResolution.kind === "resolved"
      ? buildOccasionQuietKey({ occurrenceKey: occurrence.occurrenceKey, personId: peopleResolution.personId, checkpoint })
      : null;
    const selectionQuietKey = checkpoint && peopleResolution.kind === "selection_required"
      ? buildOccasionQuietKey({ occurrenceKey: occurrence.occurrenceKey, personId: null, checkpoint })
      : null;
    let isQuiet = selectionQuietKey ? quietSet.has(selectionQuietKey) : false;
    if (personQuietKey && !isQuiet) {
      const { data: personQuiet } = await client.from("happy_proactive_quiet").select("quiet_key").eq("user_id", userId).eq("quiet_key", personQuietKey).maybeSingle();
      isQuiet = Boolean(personQuiet?.quiet_key);
    }
    if (isQuiet) continue;
    const rescue = resolveOccasionRescueEligibility({
      occurrenceKey: occurrence.occurrenceKey,
      personId: peopleResolution.kind === "resolved" ? peopleResolution.personId : null,
      recipientResolution: peopleResolution.kind === "resolved" ? "resolved" : peopleResolution.kind,
      phase: occurrence.phase,
      readiness,
    });
    if (rescue.kind === "eligible" && peopleResolution.kind === "resolved" && (occurrence.phase === "urgent" || occurrence.phase === "today")) {
      const signal = toRescueSignal({ rescueKey: rescue.rescueKey, occasionKey: occurrence.occasionKey, occurrenceKey: occurrence.occurrenceKey, personId: peopleResolution.personId, phase: occurrence.phase, missing: rescue.missing, daysUntil: occurrence.daysUntil });
      if (signal) rescues.push(signal);
      // One factual situation produces either the more actionable Rescue or
      // its passive Occasion signal, never both.
      continue;
    }
    const signal = toOccasionSignal({ occurrence, people: peopleResolution, readiness });
    if (signal) signals.push(signal);
  }
  return { occasions: signals, rescues };
}

export interface HomeRepositoryResult extends HomeRepositoryData {
  userId: string | null;
  knowledge: KnowledgeItem[];
  giftHistory?: HomeGiftHistoryRecord[];
}

async function loadGiftHistory(client: SupabaseClient, userId: string): Promise<HomeGiftHistoryRecord[]> {
  const { data, error } = await client
    .from("gifts")
    .select("id, person_id, event_id, event_context_key, title, lifecycle, occurred_on, created_at")
    .eq("user_id", userId)
    .not("person_id", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw new HomeRepositoryError("gifts", error.message);
  return (data ?? []).flatMap((gift) => (
    typeof gift.id === "string" && typeof gift.person_id === "string" && typeof gift.title === "string"
      && (gift.lifecycle === "idea" || gift.lifecycle === "selected" || gift.lifecycle === "purchased" || gift.lifecycle === "given")
      && typeof gift.created_at === "string"
      ? [{ id: gift.id, personId: gift.person_id, eventId: canonicalGiftEventContext(gift.event_id, gift.event_context_key), title: gift.title.trim(), lifecycle: gift.lifecycle, occurredOn: typeof gift.occurred_on === "string" ? gift.occurred_on : null, createdAt: gift.created_at }]
      : []
  ));
}

class HomeRepositoryError extends Error {
  constructor(readonly section: HomeDataSection, message: string) {
    super(message);
  }
}

async function loadProfile(client: SupabaseClient, userId: string): Promise<HomeProfile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new HomeRepositoryError("profile", error.message);
  return data ? { fullName: data.full_name ?? null } : null;
}

async function loadPeople(client: SupabaseClient, userId: string): Promise<HomePerson[]> {
  const { data, error } = await client
    .from("people")
    .select("id, name, birthday, birth_year, relationship, relation_label, relation_key, gender")
    .eq("user_id", userId)
    .order("name", { ascending: true })
    .limit(100);
  if (error) throw new HomeRepositoryError("people", error.message);
  return (data ?? []).map((person) => ({
    id: person.id,
    name: person.name,
    birthday: person.birthday ?? null,
    birthYear: birthYearFromFullBirthday(person.birthday) ?? (Number.isInteger(person.birth_year) ? person.birth_year : null),
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

async function loadEvents(client: SupabaseClient, userId: string): Promise<HomeStoredEvent[]> {
  const { data, error } = await client
    .from("events")
    .select("id, title, date, time_of_day, duration_minutes, location, travel_buffer_minutes, category, notes, person_id")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (error) throw new HomeRepositoryError("events", error.message);
  return (data ?? []).map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date,
    timeOfDay: typeof event.time_of_day === "string" ? event.time_of_day.slice(0, 5) : null,
    durationMinutes: Number.isInteger(event.duration_minutes) ? event.duration_minutes : null,
    location: typeof event.location === "string" ? event.location : null,
    travelBufferMinutes: Number.isInteger(event.travel_buffer_minutes) ? event.travel_buffer_minutes : null,
    category: event.category ?? null,
    notes: event.notes ?? null,
    personId: event.person_id ?? null,
  }));
}

async function loadPendingGiftOutcomes(client: SupabaseClient, userId: string): Promise<HomePendingGiftOutcome[]> {
  const { data, error } = await client
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

async function loadKnowledgeReviewPreferences(client: SupabaseClient, userId: string): Promise<HomeKnowledgeReviewPreferences> {
  const { data, error } = await client
    .from("reminder_preferences")
    .select("knowledge_review_home_enabled, knowledge_review_voice_enabled, timezone")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new HomeRepositoryError("settings", error.message);
  return {
    homeEnabled: data?.knowledge_review_home_enabled !== false,
    voiceEnabled: data?.knowledge_review_voice_enabled !== false,
    timezone: typeof data?.timezone === "string" && data.timezone.trim() ? data.timezone.trim() : "UTC",
  };
}

async function loadKnowledge(client: SupabaseClient, userId: string): Promise<{
  knowledge: KnowledgeItem[];
  memories: HomeMemory[];
}> {
  try {
    const knowledge = await listKnowledgeWithClient(client, { userId });
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

export async function getHomeRepositoryData(
  client: SupabaseClient = supabase,
  expectedUserId?: string,
  accessToken?: string,
  options: { includeGiftHistory?: boolean; now?: Date } = {},
): Promise<HomeRepositoryResult> {
  const { data: authData, error: authError } = await client.auth.getUser(accessToken);
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
      knowledgeReviewPreferences: { homeEnabled: false, voiceEnabled: false, timezone: "UTC" },
      knowledge: [],
      errors: [],
    };
  }
  if (expectedUserId && user.id !== expectedUserId) {
    throw new Error("[home.repository] Authenticated owner mismatch");
  }

  const [profileResult, peopleResult, eventsResult, knowledgeResult, giftsResult, reviewPreferencesResult, happyTasksResult, happyActionsResult, happyIdeasResult, proactivityModeResult] = await Promise.all([
    loadProfile(client, user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
    loadPeople(client, user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
    loadEvents(client, user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
    loadKnowledge(client, user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
    loadPendingGiftOutcomes(client, user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
    loadKnowledgeReviewPreferences(client, user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
    loadHappyTasks(client, user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
    loadHappyActions(client, user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
    loadHappyIdeas(client, user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
    loadProactivityMode(client, user.id).then((value) => ({ ok: true as const, value })).catch((reason) => ({ ok: false as const, reason })),
  ]);

  const errors: HomeDataError[] = [];
  if (!profileResult.ok) errors.push(errorFrom(profileResult.reason, "profile"));
  if (!peopleResult.ok) errors.push(errorFrom(peopleResult.reason, "people"));
  if (!eventsResult.ok) errors.push(errorFrom(eventsResult.reason, "events"));
  if (!knowledgeResult.ok) errors.push(errorFrom(knowledgeResult.reason, "memories"));
  if (!giftsResult.ok) errors.push(errorFrom(giftsResult.reason, "gifts"));
  if (!reviewPreferencesResult.ok) errors.push(errorFrom(reviewPreferencesResult.reason, "settings"));
  if (!happyTasksResult.ok) errors.push(errorFrom(happyTasksResult.reason, "settings"));
  if (!happyActionsResult.ok) errors.push(errorFrom(happyActionsResult.reason, "settings"));
  if (!happyIdeasResult.ok) errors.push(errorFrom(happyIdeasResult.reason, "settings"));

  let happyOccasionSignals: OccasionSignal[] = [];
  let happyRescueSignals: RescueSignal[] = [];
  if (peopleResult.ok) {
    try {
      const loaded = await loadHappyOccasionSignals(client, user.id, peopleResult.value, options.now ?? new Date());
      happyOccasionSignals = loaded.occasions;
      happyRescueSignals = loaded.rescues;
    } catch (reason) {
      errors.push(errorFrom(reason, "settings"));
    }
  }

  let giftHistory: HomeGiftHistoryRecord[] | undefined;
  if (options.includeGiftHistory) {
    try {
      giftHistory = await loadGiftHistory(client, user.id);
    } catch (reason) {
      errors.push(errorFrom(reason, "gifts"));
    }
  }

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
    knowledgeReviewPreferences: reviewPreferencesResult.ok
      ? reviewPreferencesResult.value
      : { homeEnabled: false, voiceEnabled: false, timezone: "UTC" },
    knowledge: knowledgeResult.ok ? knowledgeResult.value.knowledge : [],
    errors,
    happyTasks: happyTasksResult.ok ? happyTasksResult.value : [],
    happyActions: happyActionsResult.ok ? happyActionsResult.value : [],
    happyIdeas: happyIdeasResult.ok ? happyIdeasResult.value : [],
    happyOccasionSignals,
    happyRescueSignals,
    proactivityMode: proactivityModeResult.ok ? proactivityModeResult.value : "balanced",
    ...(giftHistory ? { giftHistory } : {}),
  };
}
