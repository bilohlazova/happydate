import type { HappyIdeaCandidate, HappyIdeaEvaluationContext } from "./ideaEvaluator.types.ts";

// Gift recommendations are generative work and are intentionally outside the
// deterministic Ideas Engine. Birthday gift_help is handled by birthdayIdeas.
export function evaluateGiftIdeas(_context: HappyIdeaEvaluationContext): HappyIdeaCandidate[] {
  return [];
}
