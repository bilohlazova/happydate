import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { projectRefFromSupabaseUrl, verifyCronAuthorization } from "./cron-auth.ts";
import { ProactiveReadError, emptyProactiveResult } from "./batching.ts";
import { BirthdayScanError, scanBirthdays } from "./birthday-scan.ts";
import { normalizeProactivityMode } from "./proactivity-policy.ts";
import { buildOccasionQuietKey } from "./proactivity-policy.ts";
import { decideOccasionBackground, type OccasionBackgroundCandidate } from "./occasion-rules.ts";
import { normalizeOccasionLeadTime, resolveOccasionReadiness, resolvePlBoysDay, resolvePostEventEligibility } from "./occasion-domain.ts";

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

function safeErrorCode(error: unknown): string {
  return (error instanceof Error ? error.message : "unknown")
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .slice(0, 120);
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
  // Authorization is the dedicated cron secret, checked before anything else.
  // `auth: "none"` only skips the platform key check; ctx.supabaseAdmin is the
  // platform-managed client and is not reachable without passing the check below.
  fetch: withSupabase({ auth: "none" }, async (request, ctx) => {
    const authorization = await verifyCronAuthorization(
      request.headers.get("authorization"),
      Deno.env.get("HAPPY_PROACTIVE_CRON_SECRET"),
      projectRefFromSupabaseUrl(Deno.env.get("SUPABASE_URL")),
    );
    if (authorization === "misconfigured") {
      console.error("happy_proactive_cron_secret_not_configured");
      return Response.json({ error: "unavailable" }, { status: 503 });
    }
    if (authorization !== "ok") return Response.json({ error: "unauthorized" }, { status: 401 });

    if (request.method !== "POST") return Response.json({ error: "method_not_allowed" }, { status: 405 });
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (!Number.isFinite(contentLength) || contentLength > 2) {
      return Response.json({ error: "unexpected_request_payload" }, { status: 400 });
    }

    const now = new Date();
    const startedAtMs = Date.now();
    const admin = ctx.supabaseAdmin;
    let scan: Awaited<ReturnType<typeof scanBirthdays>> | null = null;
    try {
      scan = await scanBirthdays(admin, now);
      const occasion = await runOccasionProactive(admin, now);
      const durationMs = Date.now() - startedAtMs;
      console.log(JSON.stringify({ event: "happy_proactive_complete", ...scan.result, occasion, pages: scan.pages, truncated: scan.truncated, durationMs }));
      return Response.json({ ...scan.result, occasion, scan: { pages: scan.pages, truncated: scan.truncated }, durationMs });
    } catch (error) {
      const cause = error instanceof BirthdayScanError ? error.cause : error;
      const progress = error instanceof BirthdayScanError ? error.progress : scan;
      const readFailure = cause instanceof ProactiveReadError || (cause instanceof Error && cause.message === "occasion_data_unavailable");
      console.error(JSON.stringify({
        event: "happy_proactive_failed",
        phase: readFailure ? "read" : "write",
        code: safeErrorCode(cause),
        pagesCompleted: progress?.pages ?? 0,
        completed: progress?.result ?? emptyProactiveResult(),
      }));
      return Response.json({ error: readFailure ? "proactive_read_failed" : "proactive_write_failed" }, { status: 500 });
    }
  }),
};

export default happyProactive;
