export const PROACTIVE_LOOKAHEAD_DAYS = 14;
export const PROACTIVE_NOTIFICATION_DAYS = 7;
export const PROACTIVE_MAX_CANDIDATES = 100;

export type ProactiveIdeaStatus = "new" | "shown" | "accepted" | "dismissed" | "expired";

export type BirthdayCandidate = {
  eventId: string;
  userId: string;
  personId: string;
  occurrenceDate: string;
  personOwnerId: string | null;
  hasActiveTask: boolean;
  hasPreparedGift: boolean;
  existingIdeaStatus: ProactiveIdeaStatus | null;
};

export type ProactiveDecision =
  | { kind: "skip"; reason: "invalidTarget" | "taskExists" | "giftPrepared" }
  | { kind: "process"; ideaKey: string | null; notificationKey: string | null; ideaExists: boolean };

export type ProactiveResult = {
  scannedCandidates: number;
  ideasCreated: number;
  notificationsCreated: number;
  skipped: {
    taskExists: number;
    giftPrepared: number;
    ideaExists: number;
    invalidTarget: number;
  };
};

export interface ProactiveWriter {
  createIdea(candidate: BirthdayCandidate, proactiveKey: string): Promise<boolean>;
  createNotification(candidate: BirthdayCandidate, dedupeKey: string): Promise<boolean>;
}

export function utcDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addUtcCalendarDays(value: Date, days: number): string {
  const copy = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  copy.setUTCDate(copy.getUTCDate() + days);
  return utcDate(copy);
}

export function proactiveIdeaKey(candidate: Pick<BirthdayCandidate, "userId" | "eventId" | "occurrenceDate">): string {
  return `birthday-preparation:${candidate.userId}:${candidate.eventId}:${candidate.occurrenceDate}`;
}

export function proactiveNotificationKey(candidate: Pick<BirthdayCandidate, "userId" | "eventId" | "occurrenceDate">): string {
  return `birthday-preparation-notification:${candidate.userId}:${candidate.eventId}:${candidate.occurrenceDate}`;
}

function calendarDaysUntil(now: Date, occurrenceDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurrenceDate)) return null;
  const date = new Date(`${occurrenceDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || utcDate(date) !== occurrenceDate) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((date.getTime() - today) / 86_400_000);
}

export function decideBirthdayProactive(candidate: BirthdayCandidate, now: Date): ProactiveDecision {
  const daysUntil = calendarDaysUntil(now, candidate.occurrenceDate);
  if (candidate.personOwnerId !== candidate.userId || daysUntil === null || daysUntil < 0 || daysUntil > PROACTIVE_LOOKAHEAD_DAYS) {
    return { kind: "skip", reason: "invalidTarget" };
  }
  if (candidate.hasActiveTask) return { kind: "skip", reason: "taskExists" };
  if (candidate.hasPreparedGift) return { kind: "skip", reason: "giftPrepared" };
  // Terminal rows deliberately retain their occurrence key: a dismiss/expiry
  // never gets resurrected by a later cron run for the same birthday.
  const ideaExists = candidate.existingIdeaStatus !== null;
  return {
    kind: "process",
    ideaKey: ideaExists ? null : proactiveIdeaKey(candidate),
    notificationKey: daysUntil <= PROACTIVE_NOTIFICATION_DAYS ? proactiveNotificationKey(candidate) : null,
    ideaExists,
  };
}

export async function runBirthdayProactive(
  candidates: readonly BirthdayCandidate[],
  now: Date,
  writer: ProactiveWriter,
): Promise<ProactiveResult> {
  const result: ProactiveResult = {
    scannedCandidates: candidates.length,
    ideasCreated: 0,
    notificationsCreated: 0,
    skipped: { taskExists: 0, giftPrepared: 0, ideaExists: 0, invalidTarget: 0 },
  };

  for (const candidate of candidates) {
    const decision = decideBirthdayProactive(candidate, now);
    if (decision.kind === "skip") {
      result.skipped[decision.reason] += 1;
      continue;
    }
    if (decision.ideaExists) result.skipped.ideaExists += 1;
    if (decision.ideaKey && await writer.createIdea(candidate, decision.ideaKey)) result.ideasCreated += 1;
    if (decision.notificationKey && await writer.createNotification(candidate, decision.notificationKey)) {
      result.notificationsCreated += 1;
    }
  }

  return result;
}
