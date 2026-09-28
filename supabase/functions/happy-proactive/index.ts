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

type TaskRow = { user_id: string; person_id: string | null; event_id: string | null };
type GiftRow = { user_id: string; person_id: string; event_id: string | null; lifecycle: string };
type IdeaRow = { user_id: string; proactive_key: string | null; status: string };

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
      return Response.json({ scannedCandidates: 0, ideasCreated: 0, notificationsCreated: 0, skipped: { taskExists: 0, giftPrepared: 0, ideaExists: 0, invalidTarget: 0 } });
    }

    const [{ data: rawTasks, error: taskError }, { data: rawGifts, error: giftError }] = await Promise.all([
      admin.from("happy_tasks").select("user_id,person_id,event_id").eq("type", "birthday_preparation").in("status", ["active", "waiting_user", "paused"]).in("event_id", eventIds),
      admin.from("gifts").select("user_id,person_id,event_id,lifecycle").in("event_id", eventIds).in("lifecycle", ["selected", "purchased"]),
    ]);
    if (taskError) throw taskError;
    if (giftError) throw giftError;

    const activeTasks = new Set(((rawTasks ?? []) as TaskRow[])
      .filter((task) => task.person_id && task.event_id)
      .map((task) => keyFor(task.user_id, task.person_id!, task.event_id!)));
    const preparedGifts = new Set(((rawGifts ?? []) as GiftRow[])
      .filter((gift) => gift.event_id)
      .map((gift) => keyFor(gift.user_id, gift.person_id, gift.event_id!)));
    const proactiveKeys = events.map((event) => proactiveIdeaKey({ userId: event.user_id, eventId: event.id, occurrenceDate: event.date }));
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
      const ideaKey = proactiveIdeaKey({ userId: event.user_id, eventId: event.id, occurrenceDate: event.date });
      return {
        eventId: event.id,
        userId: event.user_id,
        personId,
        occurrenceDate: event.date,
        personOwnerId: person?.id === personId ? person.user_id : null,
        hasActiveTask: activeTasks.has(candidateKey),
        hasPreparedGift: preparedGifts.has(candidateKey),
        existingIdeaStatus: (ideaStatuses.get(ideaKey) as BirthdayCandidate["existingIdeaStatus"]) ?? null,
      };
    });

    try {
      const result = await runBirthdayProactive(candidates, now, {
        async createIdea(candidate, proactiveKey) {
          void proactiveKey;
          const { data, error } = await admin.rpc("try_create_happy_proactive_birthday_idea", {
            p_user_id: candidate.userId,
            p_person_id: candidate.personId,
            p_event_id: candidate.eventId,
            p_occurrence_date: candidate.occurrenceDate,
          });
          if (error) throw error;
          return data === true;
        },
        async createNotification(candidate, dedupeKey) {
          void dedupeKey;
          const { data, error } = await admin.rpc("try_create_happy_proactive_birthday_notification", {
            p_user_id: candidate.userId,
            p_person_id: candidate.personId,
            p_event_id: candidate.eventId,
            p_occurrence_date: candidate.occurrenceDate,
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
