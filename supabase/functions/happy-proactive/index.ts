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
      return Response.json({
        scannedCandidates: 0,
        ideasCreated: { startGiftPlanning: 0, giftHelp: 0, prepareGreeting: 0 },
        notificationsCreated: { giftMissing: 0 },
        skipped: { giftPrepared: 0, activeTask: 0, greetingPrepared: 0, existingIdea: 0, invalidTarget: 0 },
      });
    }

    const userIds = [...new Set(events.map((event) => event.user_id))];
    const [{ data: rawTasks, error: taskError }, { data: rawGifts, error: giftError }, { data: rawProfiles, error: profileError }] = await Promise.all([
      admin.from("happy_tasks").select("id,user_id,person_id,event_id,status").eq("type", "birthday_preparation").in("event_id", eventIds),
      admin.from("gifts").select("user_id,person_id,event_id,lifecycle").in("event_id", eventIds).in("lifecycle", ["selected", "purchased"]),
      admin.from("profiles").select("id,preferred_locale").in("id", userIds),
    ]);
    if (taskError) throw taskError;
    if (giftError) throw giftError;
    if (profileError) throw profileError;

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
      console.log(JSON.stringify({ event: "happy_proactive_complete", ...result }));
      return Response.json(result);
    } catch (error) {
      console.error(JSON.stringify({ event: "happy_proactive_failed", code: safeErrorCode(error) }));
      return Response.json({ error: "proactive_write_failed" }, { status: 500 });
    }
  }),
};

export default happyProactive;
