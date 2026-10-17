import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  PROACTIVE_LOOKAHEAD_DAYS,
  PROACTIVE_MAX_CANDIDATES,
  addUtcCalendarDays,
  proactiveIdeaKey,
  runBirthdayProactive,
  type BirthdayCandidate,
} from "./proactive-rules.ts";
import { normalizeProactivityMode, proactiveQuietKey, type ProactiveSignal } from "./proactivity-policy.ts";
import { buildOccasionQuietKey } from "./proactivity-policy.ts";
import { decideOccasionBackground, type OccasionBackgroundCandidate } from "./occasion-rules.ts";
import { normalizeOccasionLeadTime, resolveOccasionReadiness, resolvePlBoysDay, resolvePostEventEligibility } from "./occasion-domain.ts";

type EventRow = {
  id: string;
  user_id: string;
  person_id: string | null;
  date: string;
  people: { id: string; user_id: string } | Array<{ id: string; user_id: string }> | null;
};

type TaskRow = { id: string; user_id: string; person_id: string | null; event_id: string | null; status: string };
type StepRow = { task_id: string; type: string; status: string };
type GiftRow = { user_id: string; person_id: string; event_id: string | null; lifecycle: string };
type IdeaRow = { user_id: string; proactive_key: string | null; status: string };
type ProfileRow = { id: string; preferred_locale: string | null };
type PreferenceRow = { user_id: string; mode: string | null };
type QuietRow = { user_id: string; quiet_key: string; disposition: string };
type OccasionPreferenceRow = { user_id: string; country_code: string | null };
type OccasionTimingRow = { user_id: string; occasion_key: string; lead_time_days: number };
type OutcomeRow = { user_id: string; occurrence_key: string; person_id: string };
type TimezoneRow = { user_id: string; timezone: string | null };
type PersonRow = { id: string; user_id: string; gender: string | null };
type TargetRow = { user_id: string; occurrence_key: string; person_id: string };
type OccasionGiftRow = { user_id: string; person_id: string; event_context_key: string | null; lifecycle: string };
type PreparationRow = { user_id: string; occurrence_key: string; person_id: string; status: string; greeting_content: string | null };

function firstPerson(value: EventRow["people"]): { id: string; user_id: string } | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function safeErrorCode(error: unknown): string {
  return (error instanceof Error ? error.message : "unknown")
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .slice(0, 120);
}

function keyFor(userId: string, personId: string, eventId: string): string {
  return `${userId}:${personId}:${eventId}`;
}

async function runOccasionProactive(admin: any, now: Date) {
  const [{ data: preferences, error: preferenceError }, { data: timings, error: timingError }, { data: timezones, error: timezoneError }, { data: people, error: peopleError }, { data: targets, error: targetError }, { data: outcomes, error: outcomeError }, { data: gifts, error: giftError }, { data: preparations, error: preparationError }, { data: quietRows, error: quietError }, { data: profiles, error: profileError }, { data: modes, error: modeError }] = await Promise.all([
    admin.from("happy_occasion_preferences").select("user_id,country_code"),
    admin.from("happy_occasion_timing_preferences").select("user_id,occasion_key,lead_time_days"),
    admin.from("reminder_preferences").select("user_id,timezone"),
    admin.from("people").select("id,user_id,gender").limit(10000),
    admin.from("happy_occasion_targets").select("user_id,occurrence_key,person_id"),
    admin.from("happy_occasion_outcomes").select("user_id,occurrence_key,person_id"),
    admin.from("gifts").select("user_id,person_id,event_context_key,lifecycle").in("lifecycle", ["selected", "purchased", "given"]),
    admin.from("happy_occasion_preparations").select("user_id,occurrence_key,person_id,status,greeting_content"),
    admin.from("happy_proactive_quiet").select("user_id,quiet_key,disposition"),
    admin.from("profiles").select("id,preferred_locale"),
    admin.from("happy_proactivity_preferences").select("user_id,mode"),
  ]);
  if (preferenceError || timingError || timezoneError || peopleError || targetError || outcomeError || giftError || preparationError || quietError || profileError || modeError) throw new Error("occasion_data_unavailable");
  const timezoneByUser = new Map((timezones ?? []).map((row: TimezoneRow) => [row.user_id, row.timezone]));
  const peopleByUser = new Map<string, PersonRow[]>();
  for (const person of (people ?? []) as PersonRow[]) peopleByUser.set(person.user_id, [...(peopleByUser.get(person.user_id) ?? []), person]);
  const targetByOccurrence = new Map((targets ?? []).map((row: TargetRow) => [`${row.user_id}:${row.occurrence_key}`, row.person_id]));
  const timingByUserOccasion = new Map((timings ?? []).map((row: OccasionTimingRow) => [`${row.user_id}:${row.occasion_key}`, normalizeOccasionLeadTime(row.lead_time_days)]));
  const outcomeSet = new Set((outcomes ?? []).map((row: OutcomeRow) => `${row.user_id}:${row.occurrence_key}:${row.person_id}`));
  const giftSet = new Set((gifts ?? []).flatMap((row: OccasionGiftRow) => row.event_context_key ? [`${row.user_id}:${row.event_context_key}`] : []));
  const prepByKey = new Map((preparations ?? []).map((row: PreparationRow) => [`${row.user_id}:${row.occurrence_key}:${row.person_id}`, row]));
  const quietSet = new Set((quietRows ?? []).map((row: QuietRow) => `${row.user_id}:${row.quiet_key}`));
  const localeByUser = new Map((profiles ?? []).map((row: ProfileRow) => [row.id, row.preferred_locale]));
  const modeByUser = new Map((modes ?? []).map((row: PreferenceRow) => [row.user_id, normalizeProactivityMode(row.mode)]));
  const result = { scannedCandidates: 0, ideasCreated: 0, notificationsCreated: 0, skipped: { ready: 0, mode: 0, quiet: 0, person: 0, outcome: 0 } };
  for (const preference of (preferences ?? []) as OccasionPreferenceRow[]) {
    if (preference.country_code !== "PL") continue;
    const localDay = (() => { try { return new Intl.DateTimeFormat("en", { timeZone: timezoneByUser.get(preference.user_id) || "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now).reduce((value, part) => ({ ...value, [part.type]: part.value }), {} as Record<string, string>) as Record<string, string>; } catch { return {}; } })();
    const localDate = localDay.year && localDay.month && localDay.day ? `${localDay.year}-${localDay.month}-${localDay.day}` : now.toISOString().slice(0, 10);
    const occurrence = resolvePlBoysDay(localDate, timingByUserOccasion.get(`${preference.user_id}:pl_boys_day`) ?? 7);
    {
      const ownedPeople = (peopleByUser.get(preference.user_id) ?? []).filter((person) => person.gender === "male");
      const postEventKey = `occasion:pl_boys_day:${new Date(`${localDate}T00:00:00.000Z`).getUTCFullYear()}`;
      const postSelected = targetByOccurrence.get(`${preference.user_id}:${postEventKey}`);
      if (postSelected && ownedPeople.some((person) => person.id === postSelected) && resolvePostEventEligibility({ localDay: localDate, occasionDate: `${localDate.slice(0, 4)}-09-30`, personId: postSelected, existingOutcome: outcomeSet.has(`${preference.user_id}:${postEventKey}:${postSelected}`) })) {
        const { data, error } = await admin.rpc("try_create_happy_proactive_occasion_artifact", { p_kind: "idea", p_user_id: preference.user_id, p_person_id: postSelected, p_occasion_key: "pl_boys_day", p_occurrence_key: postEventKey, p_milestone: "post_event", p_locale: localeByUser.get(preference.user_id) ?? "en", p_missing: [] });
        if (error) throw error;
        if (data === true) result.ideasCreated += 1;
      } else if (postSelected && outcomeSet.has(`${preference.user_id}:${postEventKey}:${postSelected}`)) result.skipped.outcome += 1;
      if (!occurrence) continue;
      const selected = targetByOccurrence.get(`${preference.user_id}:${occurrence.occurrenceKey}`);
      const selectedOwned = selected && ownedPeople.some((person) => person.id === selected) ? selected : null;
      const personId = selectedOwned ?? (ownedPeople.length === 1 ? ownedPeople[0].id : null);
      if (!personId) { result.skipped.person += 1; continue; }
      const giftContext = `${occurrence.occurrenceKey}:${personId}`;
      const preparation = prepByKey.get(`${preference.user_id}:${occurrence.occurrenceKey}:${personId}`);
      const giftReady = giftSet.has(`${preference.user_id}:${giftContext}`);
      const greetingReady = Boolean(preparation?.greeting_content?.trim());
      const preparationReady = preparation?.status === "completed";
      const readiness = resolveOccasionReadiness({ giftReady, greetingReady, preparationStatus: preparation?.status === "in_progress" ? "in_progress" : preparationReady ? "completed" : "not_started" }).kind;
      const quietKey = buildOccasionQuietKey({ occurrenceKey: occurrence.occurrenceKey, personId, checkpoint: occurrence.phase });
      const candidate: OccasionBackgroundCandidate = { userId: preference.user_id, occasionKey: occurrence.occasionKey, occurrenceKey: occurrence.occurrenceKey, personId, phase: occurrence.phase, readiness, quiet: quietSet.has(`${preference.user_id}:${quietKey}`), mode: modeByUser.get(preference.user_id) ?? "balanced" };
      result.scannedCandidates += 1;
      const decision = decideOccasionBackground(candidate);
      if (decision.kind === "skip") { if (decision.reason === "ready") result.skipped.ready += 1; else if (decision.reason === "mode_blocked") result.skipped.mode += 1; else if (decision.reason === "quiet") result.skipped.quiet += 1; continue; }
      const { data, error } = await admin.rpc("try_create_happy_proactive_occasion_artifact", { p_kind: decision.artifact, p_user_id: preference.user_id, p_person_id: personId, p_occasion_key: occurrence.occasionKey, p_occurrence_key: occurrence.occurrenceKey, p_milestone: decision.milestone, p_locale: localeByUser.get(preference.user_id) ?? "en", p_missing: [] });
      if (error) throw error;
      if (data === true) decision.artifact === "idea" ? result.ideasCreated += 1 : result.notificationsCreated += 1;
    }
  }
  return result;
}

const happyProactive = {
  fetch: withSupabase({ auth: "secret" }, async (request, ctx) => {
    if (request.method !== "POST") return Response.json({ error: "method_not_allowed" }, { status: 405 });
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (!Number.isFinite(contentLength) || contentLength > 2) {
      return Response.json({ error: "unexpected_request_payload" }, { status: 400 });
    }

    const now = new Date();
    const startDate = now.toISOString().slice(0, 10);
    const endDate = addUtcCalendarDays(now, PROACTIVE_LOOKAHEAD_DAYS);
    const admin = ctx.supabaseAdmin;
    const { data: rawEvents, error: eventError } = await admin
      .from("events")
      .select("id,user_id,person_id,date,people!events_person_id_fkey(id,user_id)")
      .eq("category", "birthday")
      .not("person_id", "is", null)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })
      .limit(PROACTIVE_MAX_CANDIDATES);
    if (eventError) throw eventError;

    const events = (rawEvents ?? []) as EventRow[];
    const eventIds = events.map((event) => event.id);
    if (!eventIds.length) {
      const occasion = await runOccasionProactive(admin, now);
      return Response.json({
        scannedCandidates: 0,
        ideasCreated: { startGiftPlanning: 0, giftHelp: 0, prepareGreeting: 0 },
        notificationsCreated: { giftMissing: 0 },
        skipped: { giftPrepared: 0, activeTask: 0, greetingPrepared: 0, existingIdea: 0, invalidTarget: 0 },
        occasion,
      });
    }

    const userIds = [...new Set(events.map((event) => event.user_id))];
    const [{ data: rawTasks, error: taskError }, { data: rawGifts, error: giftError }, { data: rawProfiles, error: profileError }, { data: rawPreferences, error: preferenceError }] = await Promise.all([
      admin.from("happy_tasks").select("id,user_id,person_id,event_id,status").eq("type", "birthday_preparation").in("event_id", eventIds),
      admin.from("gifts").select("user_id,person_id,event_id,lifecycle").in("event_id", eventIds).in("lifecycle", ["selected", "purchased"]),
      admin.from("profiles").select("id,preferred_locale").in("id", userIds),
      admin.from("happy_proactivity_preferences").select("user_id,mode").in("user_id", userIds),
    ]);
    if (taskError) throw taskError;
    if (giftError) throw giftError;
    if (profileError) throw profileError;
    if (preferenceError) throw preferenceError;

    const tasks = (rawTasks ?? []) as TaskRow[];
    const activeTasks = new Set(tasks
      .filter((task) => task.person_id && task.event_id && ["active", "waiting_user", "paused"].includes(task.status))
      .map((task) => keyFor(task.user_id, task.person_id!, task.event_id!)));
    const taskIds = tasks.map((task) => task.id);
    const { data: rawSteps, error: stepError } = taskIds.length
      ? await admin.from("happy_task_steps").select("task_id,type,status").in("task_id", taskIds).eq("type", "prepare_greeting").eq("status", "completed")
      : { data: [], error: null };
    if (stepError) throw stepError;
    const taskById = new Map(tasks.map((task) => [task.id, task]));
    const completedGreetingKeys = new Set(((rawSteps ?? []) as StepRow[])
      .flatMap((step) => {
        const task = taskById.get(step.task_id);
        return task?.person_id && task.event_id ? [keyFor(task.user_id, task.person_id, task.event_id)] : [];
      }));
    const preparedGifts = new Set(((rawGifts ?? []) as GiftRow[])
      .filter((gift) => gift.event_id)
      .map((gift) => keyFor(gift.user_id, gift.person_id, gift.event_id!)));
    const profileLocales = new Map(((rawProfiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile.preferred_locale]));
    const userModes = new Map(((rawPreferences ?? []) as PreferenceRow[]).map((row) => [row.user_id, normalizeProactivityMode(row.mode)]));
    const proactiveKeys = events.flatMap((event) => [
      proactiveIdeaKey("start_gift_planning", { eventId: event.id, occurrenceDate: event.date }),
      proactiveIdeaKey("gift_help", { eventId: event.id, occurrenceDate: event.date }),
      proactiveIdeaKey("prepare_greeting", { eventId: event.id, occurrenceDate: event.date }),
    ]);
    const { data: rawIdeas, error: ideaError } = await admin
      .from("happy_ideas")
      .select("user_id,proactive_key,status")
      .in("proactive_key", proactiveKeys);
    if (ideaError) throw ideaError;
    const ideaStatuses = new Map(((rawIdeas ?? []) as IdeaRow[])
      .filter((idea) => idea.proactive_key)
      .map((idea) => [idea.proactive_key!, idea.status]));
    const quietKeys = events.flatMap((event) => (["start_gift_planning", "gift_help", "prepare_greeting", "gift_missing"] as ProactiveSignal[])
      .map((signal) => proactiveQuietKey({ userId: event.user_id, eventId: event.id, occurrenceDate: event.date, signal })));
    const { data: rawQuiet, error: quietError } = await admin
      .from("happy_proactive_quiet")
      .select("user_id,quiet_key,disposition")
      .in("quiet_key", quietKeys);
    if (quietError) throw quietError;
    const quietByUser = new Set(((rawQuiet ?? []) as QuietRow[]).map((row) => `${row.user_id}:${row.quiet_key}`));

    const candidates: BirthdayCandidate[] = events.map((event) => {
      const person = firstPerson(event.people);
      const personId = event.person_id ?? "";
      const candidateKey = keyFor(event.user_id, personId, event.id);
      const startGiftPlanningKey = proactiveIdeaKey("start_gift_planning", { eventId: event.id, occurrenceDate: event.date });
      const giftHelpKey = proactiveIdeaKey("gift_help", { eventId: event.id, occurrenceDate: event.date });
      const prepareGreetingKey = proactiveIdeaKey("prepare_greeting", { eventId: event.id, occurrenceDate: event.date });
      const preferredLocale = profileLocales.get(event.user_id);
      return {
        eventId: event.id,
        userId: event.user_id,
        personId,
        occurrenceDate: event.date,
        personOwnerId: person?.id === personId ? person.user_id : null,
        locale: preferredLocale === "uk" || preferredLocale === "pl" || preferredLocale === "de" || preferredLocale === "ru" ? preferredLocale : "en",
        hasActiveTask: activeTasks.has(candidateKey),
        hasPreparedGift: preparedGifts.has(candidateKey),
        hasGreetingPrepared: completedGreetingKeys.has(candidateKey),
        existingIdeaStatuses: {
          ...(ideaStatuses.has(startGiftPlanningKey) ? { start_gift_planning: ideaStatuses.get(startGiftPlanningKey) as BirthdayCandidate["existingIdeaStatuses"]["start_gift_planning"] } : {}),
          ...(ideaStatuses.has(giftHelpKey) ? { gift_help: ideaStatuses.get(giftHelpKey) as BirthdayCandidate["existingIdeaStatuses"]["gift_help"] } : {}),
          ...(ideaStatuses.has(prepareGreetingKey) ? { prepare_greeting: ideaStatuses.get(prepareGreetingKey) as BirthdayCandidate["existingIdeaStatuses"]["prepare_greeting"] } : {}),
        },
        mode: userModes.get(event.user_id) ?? "balanced",
        quietSignals: {
          start_gift_planning: quietByUser.has(`${event.user_id}:${proactiveQuietKey({ userId: event.user_id, eventId: event.id, occurrenceDate: event.date, signal: "start_gift_planning" })}`),
          gift_help: quietByUser.has(`${event.user_id}:${proactiveQuietKey({ userId: event.user_id, eventId: event.id, occurrenceDate: event.date, signal: "gift_help" })}`),
          prepare_greeting: quietByUser.has(`${event.user_id}:${proactiveQuietKey({ userId: event.user_id, eventId: event.id, occurrenceDate: event.date, signal: "prepare_greeting" })}`),
          gift_missing: quietByUser.has(`${event.user_id}:${proactiveQuietKey({ userId: event.user_id, eventId: event.id, occurrenceDate: event.date, signal: "gift_missing" })}`),
        },
      };
    });

    try {
      const result = await runBirthdayProactive(candidates, now, {
        async createIdea(candidate, rule, proactiveKey) {
          void proactiveKey;
          const { data, error } = await admin.rpc("try_create_happy_proactive_birthday_idea", {
            p_rule: rule,
            p_user_id: candidate.userId,
            p_person_id: candidate.personId,
            p_event_id: candidate.eventId,
            p_occurrence_date: candidate.occurrenceDate,
            p_locale: candidate.locale,
          });
          if (error) throw error;
          return data === true;
        },
        async createGiftMissingNotification(candidate, dedupeKey) {
          void dedupeKey;
          const { data, error } = await admin.rpc("try_create_happy_proactive_birthday_gift_missing_notification", {
            p_user_id: candidate.userId,
            p_person_id: candidate.personId,
            p_event_id: candidate.eventId,
            p_occurrence_date: candidate.occurrenceDate,
            p_locale: candidate.locale,
          });
          if (error) throw error;
          return data === true;
        },
      });
      const occasion = await runOccasionProactive(admin, now);
      console.log(JSON.stringify({ event: "happy_proactive_complete", ...result, occasion }));
      return Response.json({ ...result, occasion });
    } catch (error) {
      console.error(JSON.stringify({ event: "happy_proactive_failed", code: safeErrorCode(error) }));
      return Response.json({ error: "proactive_write_failed" }, { status: 500 });
    }
  }),
};

export default happyProactive;
