import type {
  BirthdayEligibilityCandidate,
  BirthdayIdeaRule,
} from "../../../../supabase/functions/happy-proactive/proactive-rules.ts";

export type HappyIdeaKind = BirthdayIdeaRule;
export type HappyIdeaSource = "birthday_event";
export type HappyIdeaPriority = "normal";

export type BirthdayIdeaCandidate = {
  kind: HappyIdeaKind;
  source: HappyIdeaSource;
  personId: string;
  eventId: string;
  semanticKey: string;
  priority: HappyIdeaPriority;
  payload: { occurrenceDate: string };
};

export type HappyIdeaCandidate = BirthdayIdeaCandidate;

// This is a bounded, preloaded evaluation input. It deliberately contains no
// Supabase client, provider, transcript, or data from other owners/events.
export type HappyIdeaEvaluationContext = {
  userId: string;
  eventId?: string;
  now: Date;
  birthdayCandidates: readonly BirthdayEligibilityCandidate[];
};

export type IdeaEvaluator<TContext = HappyIdeaEvaluationContext> = (
  context: TContext,
) => HappyIdeaCandidate | readonly HappyIdeaCandidate[] | null;
