import {
  PROACTIVE_LOOKAHEAD_DAYS,
  PROACTIVE_MAX_CANDIDATES,
  addUtcCalendarDays,
  proactiveIdeaKey,
  runBirthdayProactive,
  type BirthdayCandidate,
  type ProactiveResult,
} from "./proactive-rules.ts";
import { normalizeProactivityMode, proactiveQuietKey, type ProactiveSignal } from "./proactivity-policy.ts";
import {
  PROACTIVE_MAX_PAGES_PER_RUN,
  PROACTIVE_RUN_TIME_BUDGET_MS,
  ProactiveReadError,
  emptyProactiveResult,
  eventCursorFilter,
  mergeProactiveResults,
  selectInChunks,
  type EventCursor,
} from "./batching.ts";

// deno-lint-ignore no-explicit-any
type Admin = any;

export type EventRow = {
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

export type BirthdayScanSummary = { result: ProactiveResult; pages: number; truncated: boolean };

function firstPerson(value: EventRow["people"]): { id: string; user_id: string } | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function keyFor(userId: string, personId: string, eventId: string): string {
  return `${userId}:${personId}:${eventId}`;
}

// One page of upcoming birthdays in a stable (date, id) order. Pagination is
// keyset-based, so rows inserted while a run is in progress cannot shift pages.
export async function readEventPage(admin: Admin, startDate: string, endDate: string, cursor: EventCursor | null): Promise<EventRow[]> {
  let query = admin
    .from("events")
    .select("id,user_id,person_id,date,people!events_person_id_fkey(id,user_id)")
    .eq("category", "birthday")
    .not("person_id", "is", null)
    .gte("date", startDate)
    .lte("date", endDate);
  if (cursor) query = query.or(eventCursorFilter(cursor));
  const { data, error } = await query
    .order("date", { ascending: true })
    .order("id", { ascending: true })
    .limit(PROACTIVE_MAX_CANDIDATES);
  if (error) throw new ProactiveReadError("events", "query");
  return (data ?? []) as EventRow[];
}

export async function buildCandidates(admin: Admin, events: readonly EventRow[]): Promise<BirthdayCandidate[]> {
  const eventIds = events.map((event) => event.id);
  const userIds = [...new Set(events.map((event) => event.user_id))];

  const tasks = await selectInChunks<TaskRow>("happy_tasks", eventIds, (chunk) =>
    admin.from("happy_tasks").select("id,user_id,person_id,event_id,status").eq("type", "birthday_preparation").in("event_id", chunk));
  const rawGifts = await selectInChunks<GiftRow>("gifts", eventIds, (chunk) =>
    admin.from("gifts").select("user_id,person_id,event_id,lifecycle").in("event_id", chunk).in("lifecycle", ["selected", "purchased"]));
  const rawProfiles = await selectInChunks<ProfileRow>("profiles", userIds, (chunk) =>
    admin.from("profiles").select("id,preferred_locale").in("id", chunk));
  const rawPreferences = await selectInChunks<PreferenceRow>("happy_proactivity_preferences", userIds, (chunk) =>
    admin.from("happy_proactivity_preferences").select("user_id,mode").in("user_id", chunk));

  const activeTasks = new Set(tasks
    .filter((task) => task.person_id && task.event_id && ["active", "waiting_user", "paused"].includes(task.status))
    .map((task) => keyFor(task.user_id, task.person_id!, task.event_id!)));
  const taskIds = tasks.map((task) => task.id);
  const rawSteps = await selectInChunks<StepRow>("happy_task_steps", taskIds, (chunk) =>
    admin.from("happy_task_steps").select("task_id,type,status").in("task_id", chunk).eq("type", "prepare_greeting").eq("status", "completed"));
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const completedGreetingKeys = new Set(rawSteps.flatMap((step) => {
    const task = taskById.get(step.task_id);
    return task?.person_id && task.event_id ? [keyFor(task.user_id, task.person_id, task.event_id)] : [];
  }));
  const preparedGifts = new Set(rawGifts
    .filter((gift) => gift.event_id)
    .map((gift) => keyFor(gift.user_id, gift.person_id, gift.event_id!)));
  const profileLocales = new Map(rawProfiles.map((profile) => [profile.id, profile.preferred_locale]));
  const userModes = new Map(rawPreferences.map((row) => [row.user_id, normalizeProactivityMode(row.mode)]));

  const proactiveKeys = events.flatMap((event) => [
    proactiveIdeaKey("start_gift_planning", { eventId: event.id, occurrenceDate: event.date }),
    proactiveIdeaKey("gift_help", { eventId: event.id, occurrenceDate: event.date }),
    proactiveIdeaKey("prepare_greeting", { eventId: event.id, occurrenceDate: event.date }),
  ]);
  const rawIdeas = await selectInChunks<IdeaRow>("happy_ideas", proactiveKeys, (chunk) =>
    admin.from("happy_ideas").select("user_id,proactive_key,status").in("proactive_key", chunk));
  const ideaStatuses = new Map(rawIdeas
    .filter((idea) => idea.proactive_key)
    .map((idea) => [idea.proactive_key!, idea.status]));

  const quietKeys = events.flatMap((event) => (["start_gift_planning", "gift_help", "prepare_greeting", "gift_missing"] as ProactiveSignal[])
    .map((signal) => proactiveQuietKey({ userId: event.user_id, eventId: event.id, occurrenceDate: event.date, signal })));
  const rawQuiet = await selectInChunks<QuietRow>("happy_proactive_quiet", quietKeys, (chunk) =>
    admin.from("happy_proactive_quiet").select("user_id,quiet_key,disposition").in("quiet_key", chunk));
  const quietByUser = new Set(rawQuiet.map((row) => `${row.user_id}:${row.quiet_key}`));

  return events.map((event) => {
    const person = firstPerson(event.people);
    const personId = event.person_id ?? "";
    const candidateKey = keyFor(event.user_id, personId, event.id);
    const startGiftPlanningKey = proactiveIdeaKey("start_gift_planning", { eventId: event.id, occurrenceDate: event.date });
    const giftHelpKey = proactiveIdeaKey("gift_help", { eventId: event.id, occurrenceDate: event.date });
    const prepareGreetingKey = proactiveIdeaKey("prepare_greeting", { eventId: event.id, occurrenceDate: event.date });
    const preferredLocale = profileLocales.get(event.user_id);
    const quiet = (signal: ProactiveSignal) =>
      quietByUser.has(`${event.user_id}:${proactiveQuietKey({ userId: event.user_id, eventId: event.id, occurrenceDate: event.date, signal })}`);
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
        start_gift_planning: quiet("start_gift_planning"),
        gift_help: quiet("gift_help"),
        prepare_greeting: quiet("prepare_greeting"),
        gift_missing: quiet("gift_missing"),
      },
    };
  });
}

export function proactiveWriter(admin: Admin) {
  return {
    async createIdea(candidate: BirthdayCandidate, rule: string, proactiveKey: string) {
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
    async createGiftMissingNotification(candidate: BirthdayCandidate, dedupeKey: string) {
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
  };
}

// Walks every page of upcoming birthdays. Pages already completed stay written
// when a later page fails (writes are idempotent), so the failure carries the
// progress made so far for the caller to log.
export class BirthdayScanError extends Error {
  readonly progress: BirthdayScanSummary;
  constructor(cause: unknown, progress: BirthdayScanSummary) {
    super("birthday_scan_failed", { cause });
    this.name = "BirthdayScanError";
    this.progress = progress;
  }
}

export async function scanBirthdays(
  admin: Admin,
  now: Date,
  options: { maxPages?: number; timeBudgetMs?: number; clock?: () => number } = {},
): Promise<BirthdayScanSummary> {
  const maxPages = options.maxPages ?? PROACTIVE_MAX_PAGES_PER_RUN;
  const timeBudgetMs = options.timeBudgetMs ?? PROACTIVE_RUN_TIME_BUDGET_MS;
  const clock = options.clock ?? Date.now;
  const startedAt = clock();
  const startDate = now.toISOString().slice(0, 10);
  const endDate = addUtcCalendarDays(now, PROACTIVE_LOOKAHEAD_DAYS);
  const summary: BirthdayScanSummary = { result: emptyProactiveResult(), pages: 0, truncated: false };
  let cursor: EventCursor | null = null;
  try {
    for (;;) {
      if (summary.pages >= maxPages || clock() - startedAt > timeBudgetMs) {
        summary.truncated = true;
        break;
      }
      const events = await readEventPage(admin, startDate, endDate, cursor);
      if (events.length === 0) break;
      const candidates = await buildCandidates(admin, events);
      mergeProactiveResults(summary.result, await runBirthdayProactive(candidates, now, proactiveWriter(admin)));
      summary.pages += 1;
      if (events.length < PROACTIVE_MAX_CANDIDATES) break;
      const last = events[events.length - 1];
      cursor = { date: last.date, id: last.id };
    }
  } catch (error) {
    throw new BirthdayScanError(error, summary);
  }
  return summary;
}
