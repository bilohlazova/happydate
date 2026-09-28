export const PROACTIVE_LOOKAHEAD_DAYS = 30;
export const PROACTIVE_NOTIFICATION_DAYS = 5;
export const PROACTIVE_MAX_CANDIDATES = 100;

export type ProactiveLocale = "uk" | "pl" | "en" | "de" | "ru";
export type BirthdayIdeaRule = "start_gift_planning" | "gift_help" | "prepare_greeting";
export type ProactiveIdeaStatus = "new" | "shown" | "accepted" | "dismissed" | "expired";

export type BirthdayCandidate = {
  eventId: string;
  userId: string;
  personId: string;
  occurrenceDate: string;
  personOwnerId: string | null;
  locale: ProactiveLocale;
  hasActiveTask: boolean;
  hasPreparedGift: boolean;
  hasGreetingPrepared: boolean;
  existingIdeaStatuses: Partial<Record<BirthdayIdeaRule, ProactiveIdeaStatus>>;
};

// Eligibility is intentionally independent from locale and persistence. It is
// shared by the pure Ideas Engine and the Edge Function's durable writer.
export type BirthdayEligibilityCandidate = Omit<BirthdayCandidate, "locale">;

export type ProactiveDecision =
  | { kind: "skip"; reason: "invalidTarget" | "giftPrepared" }
  | { kind: "process"; ideaRules: BirthdayIdeaRule[]; notifyGiftMissing: boolean; skippedActiveTask: boolean; skippedGreetingPrepared: boolean; existingIdeas: number };

export type ProactiveResult = {
  scannedCandidates: number;
  ideasCreated: { startGiftPlanning: number; giftHelp: number; prepareGreeting: number };
  notificationsCreated: { giftMissing: number };
  skipped: { giftPrepared: number; activeTask: number; greetingPrepared: number; existingIdea: number; invalidTarget: number };
};

export interface ProactiveWriter {
  createIdea(candidate: BirthdayCandidate, rule: BirthdayIdeaRule, proactiveKey: string): Promise<boolean>;
  createGiftMissingNotification(candidate: BirthdayCandidate, dedupeKey: string): Promise<boolean>;
}

export function utcDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addUtcCalendarDays(value: Date, days: number): string {
  const copy = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  copy.setUTCDate(copy.getUTCDate() + days);
  return utcDate(copy);
}

export function proactiveIdeaKey(rule: BirthdayIdeaRule, candidate: Pick<BirthdayCandidate, "eventId" | "occurrenceDate">): string {
  return `birthday:${rule}:${candidate.eventId}:${candidate.occurrenceDate}`;
}

export function proactiveGiftMissingNotificationKey(candidate: Pick<BirthdayCandidate, "userId" | "eventId" | "occurrenceDate">): string {
  return `birthday:gift_missing:${candidate.userId}:${candidate.eventId}:${candidate.occurrenceDate}`;
}

function calendarDaysUntil(now: Date, occurrenceDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurrenceDate)) return null;
  const date = new Date(`${occurrenceDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || utcDate(date) !== occurrenceDate) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((date.getTime() - today) / 86_400_000);
}

export function decideBirthdayProactive(candidate: BirthdayEligibilityCandidate, now: Date): ProactiveDecision {
  const daysUntil = calendarDaysUntil(now, candidate.occurrenceDate);
  if (candidate.personOwnerId !== candidate.userId || daysUntil === null || daysUntil < 0 || daysUntil > PROACTIVE_LOOKAHEAD_DAYS) {
    return { kind: "skip", reason: "invalidTarget" };
  }
  const ideaRules: BirthdayIdeaRule[] = [];
  let skippedActiveTask = false;
  let skippedGreetingPrepared = false;
  let existingIdeas = 0;
  const addIfNew = (rule: BirthdayIdeaRule) => {
    if (candidate.existingIdeaStatuses[rule]) {
      existingIdeas += 1;
      return;
    }
    ideaRules.push(rule);
  };

  if (candidate.hasPreparedGift) {
    if (daysUntil !== 1) return { kind: "skip", reason: "giftPrepared" };
    if (candidate.hasGreetingPrepared) skippedGreetingPrepared = true;
    else addIfNew("prepare_greeting");
  } else {
    if (daysUntil >= 15 && daysUntil <= 30) addIfNew("start_gift_planning");
    if (daysUntil <= 14) {
      if (candidate.hasActiveTask) skippedActiveTask = true;
      else addIfNew("gift_help");
    }
  }

  return {
    kind: "process",
    ideaRules,
    notifyGiftMissing: !candidate.hasPreparedGift && daysUntil <= PROACTIVE_NOTIFICATION_DAYS,
    skippedActiveTask,
    skippedGreetingPrepared,
    existingIdeas,
  };
}

export async function runBirthdayProactive(
  candidates: readonly BirthdayCandidate[],
  now: Date,
  writer: ProactiveWriter,
): Promise<ProactiveResult> {
  const result: ProactiveResult = {
    scannedCandidates: candidates.length,
    ideasCreated: { startGiftPlanning: 0, giftHelp: 0, prepareGreeting: 0 },
    notificationsCreated: { giftMissing: 0 },
    skipped: { giftPrepared: 0, activeTask: 0, greetingPrepared: 0, existingIdea: 0, invalidTarget: 0 },
  };

  for (const candidate of candidates) {
    const decision = decideBirthdayProactive(candidate, now);
    if (decision.kind === "skip") {
      result.skipped[decision.reason] += 1;
      continue;
    }
    if (decision.skippedActiveTask) result.skipped.activeTask += 1;
    if (decision.skippedGreetingPrepared) result.skipped.greetingPrepared += 1;
    result.skipped.existingIdea += decision.existingIdeas;
    for (const rule of decision.ideaRules) {
      if (await writer.createIdea(candidate, rule, proactiveIdeaKey(rule, candidate))) {
        if (rule === "start_gift_planning") result.ideasCreated.startGiftPlanning += 1;
        else if (rule === "gift_help") result.ideasCreated.giftHelp += 1;
        else result.ideasCreated.prepareGreeting += 1;
      }
    }
    if (decision.notifyGiftMissing && await writer.createGiftMissingNotification(candidate, proactiveGiftMissingNotificationKey(candidate))) {
      result.notificationsCreated.giftMissing += 1;
    }
  }

  return result;
}
