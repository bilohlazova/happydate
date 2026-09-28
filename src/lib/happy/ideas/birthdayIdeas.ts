import {
  decideBirthdayProactive,
  proactiveIdeaKey,
  type BirthdayIdeaRule,
} from "../../../../supabase/functions/happy-proactive/proactive-rules.ts";
import type { BirthdayIdeaCandidate, HappyIdeaCandidate, HappyIdeaEvaluationContext } from "./ideaEvaluator.types.ts";

function candidateForRule(
  rule: BirthdayIdeaRule,
  candidate: HappyIdeaEvaluationContext["birthdayCandidates"][number],
): BirthdayIdeaCandidate {
  return {
    kind: rule,
    source: "birthday_event",
    personId: candidate.personId,
    eventId: candidate.eventId,
    semanticKey: proactiveIdeaKey(rule, candidate),
    priority: "normal",
    payload: { occurrenceDate: candidate.occurrenceDate },
  };
}

// The date windows and durable-state suppression remain canonical in
// decideBirthdayProactive. This adapter only converts eligible rules to typed
// candidates; persistence retains final database-backed dedupe.
export function evaluateBirthdayIdeas(context: HappyIdeaEvaluationContext): HappyIdeaCandidate[] {
  const ideas: HappyIdeaCandidate[] = [];
  for (const candidate of context.birthdayCandidates) {
    if (candidate.userId !== context.userId) continue;
    if (context.eventId && candidate.eventId !== context.eventId) continue;
    const decision = decideBirthdayProactive(candidate, context.now);
    if (decision.kind !== "process") continue;
    for (const rule of decision.ideaRules) ideas.push(candidateForRule(rule, candidate));
  }
  return ideas;
}
