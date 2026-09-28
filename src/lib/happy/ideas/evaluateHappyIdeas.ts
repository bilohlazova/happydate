import { evaluateBirthdayIdeas } from "./birthdayIdeas.ts";
import { evaluateGiftIdeas } from "./giftIdeas.ts";
import type { HappyIdeaCandidate, HappyIdeaEvaluationContext, IdeaEvaluator } from "./ideaEvaluator.types.ts";
import { evaluateMemoryIdeas } from "./memoryIdeas.ts";
import { evaluateRelationshipIdeas } from "./relationshipIdeas.ts";

const evaluators: readonly IdeaEvaluator[] = [
  evaluateBirthdayIdeas,
  evaluateGiftIdeas,
  evaluateMemoryIdeas,
  evaluateRelationshipIdeas,
];

function candidatesFrom(result: ReturnType<IdeaEvaluator>): readonly HappyIdeaCandidate[] {
  if (!result) return [];
  if (Array.isArray(result)) return result as readonly HappyIdeaCandidate[];
  return [result as HappyIdeaCandidate];
}

// Stable evaluator order and in-pass semantic-key collapse are convenience
// only. Durable dedupe remains the responsibility of the persistence layer.
export function evaluateHappyIdeas(context: HappyIdeaEvaluationContext): HappyIdeaCandidate[] {
  const seen = new Set<string>();
  const candidates: HappyIdeaCandidate[] = [];
  for (const evaluator of evaluators) {
    for (const candidate of candidatesFrom(evaluator(context))) {
      if (seen.has(candidate.semanticKey)) continue;
      seen.add(candidate.semanticKey);
      candidates.push(candidate);
    }
  }
  return candidates;
}
