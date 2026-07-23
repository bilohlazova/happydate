import type {
  GiftDiscoveryAnsweredQuestion,
  GiftDiscoveryQuestion,
  GiftDiscoveryQuestionType,
  GiftDiscoveryPromptInput,
  GiftDiscoverySession,
  BuildGiftDiscoverySessionInput,
} from "./giftDiscovery.types.ts";
import { giftDiscoveryQuestionTypeFromId } from "./giftDiscoveryAnswers.ts";
import type {
  GiftIntelligenceMissingSignal,
  GiftRecommendationContext,
} from "../gift-intelligence";

type QuestionPlan = {
  type: GiftDiscoveryQuestionType;
  sourceSignal: GiftIntelligenceMissingSignal;
  impact: number;
};

const QUESTION_PLAN: readonly QuestionPlan[] = [
  { type: "budget", sourceSignal: "missing_budget", impact: 100 },
  { type: "relationshipStrength", sourceSignal: "missing_relationship", impact: 90 },
  { type: "interests", sourceSignal: "missing_preferences", impact: 80 },
  { type: "dislikedGifts", sourceSignal: "missing_dislikes", impact: 70 },
  { type: "preferredStyle", sourceSignal: "missing_preferences", impact: 60 },
  { type: "favoriteBrands", sourceSignal: "missing_preferences", impact: 50 },
  { type: "hobbies", sourceSignal: "missing_preferences", impact: 45 },
  { type: "urgency", sourceSignal: "missing_event", impact: 40 },
] as const;

const COMPLETION_WEIGHTS: Readonly<Record<GiftIntelligenceMissingSignal, number>> = {
  missing_person: 10,
  missing_event: 5,
  missing_relationship: 15,
  missing_gender: 5,
  missing_age: 5,
  missing_budget: 20,
  missing_preferences: 20,
  missing_dislikes: 10,
  missing_memories: 15,
  missing_previous_gifts: 10,
};

function stableHash(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

function uniqueMissingSignals(
  context: GiftRecommendationContext,
): GiftIntelligenceMissingSignal[] {
  const seen = new Set<GiftIntelligenceMissingSignal>();
  const result: GiftIntelligenceMissingSignal[] = [];
  for (const signal of context.missingSignals) {
    if (seen.has(signal)) continue;
    seen.add(signal);
    result.push(signal);
  }
  return result;
}

function alreadyKnown(
  context: GiftRecommendationContext,
  type: GiftDiscoveryQuestionType,
): boolean {
  switch (type) {
    case "budget":
      return context.budget.amount !== null;
    case "relationshipStrength":
      return Boolean(context.person.relationKey);
    case "interests":
      return context.knowledge.interests.length > 0 || context.preferences.interests.length > 0;
    case "hobbies":
      return context.knowledge.hobbies.length > 0;
    case "dislikedGifts":
      return context.knowledge.dislikedGifts.length > 0 || context.preferences.dislikes.length > 0;
    case "preferredStyle":
      return context.knowledge.preferredStyles.length > 0 || context.preferences.wishes.length > 0;
    case "favoriteBrands":
      return context.knowledge.favoriteBrands.length > 0;
    case "urgency":
      return context.event.id !== null || context.event.date !== null || context.event.daysUntil !== null;
  }
}

function sanitizeAnsweredQuestions(
  answeredQuestions: readonly GiftDiscoveryAnsweredQuestion[],
): GiftDiscoveryAnsweredQuestion[] {
  const seen = new Set<GiftDiscoveryQuestionType>();
  const result: GiftDiscoveryAnsweredQuestion[] = [];
  for (const answer of answeredQuestions) {
    if (seen.has(answer.type)) continue;
    seen.add(answer.type);
    result.push({
      type: answer.type,
      answeredAt: answer.answeredAt ?? null,
    });
  }
  return result;
}

function buildQuestions(
  context: GiftRecommendationContext,
  missingSignals: readonly GiftIntelligenceMissingSignal[],
  answeredQuestions: readonly GiftDiscoveryAnsweredQuestion[],
): GiftDiscoveryQuestion[] {
  const missing = new Set(missingSignals);
  const answered = new Set(answeredQuestions.map((answer) => answer.type));
  const questions: GiftDiscoveryQuestion[] = [];
  const seen = new Set<GiftDiscoveryQuestionType>();

  for (const plan of QUESTION_PLAN) {
    if (!missing.has(plan.sourceSignal)) continue;
    if (answered.has(plan.type)) continue;
    if (seen.has(plan.type)) continue;
    if (alreadyKnown(context, plan.type)) continue;
    seen.add(plan.type);
    questions.push({
      id: `${plan.sourceSignal}:${plan.type}`,
      type: plan.type,
      sourceSignal: plan.sourceSignal,
      impact: plan.impact,
    });
  }

  return questions;
}

function completionScore(
  missingSignals: readonly GiftIntelligenceMissingSignal[],
): number {
  const missing = new Set(missingSignals);
  const total = Object.values(COMPLETION_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  const penalty = [...missing].reduce(
    (sum, signal) => sum + COMPLETION_WEIGHTS[signal],
    0,
  );
  return Math.max(0, Math.min(100, Math.round(((total - penalty) / total) * 100)));
}

function sessionId(
  context: GiftRecommendationContext,
  followUpQuestions: readonly string[],
  answeredQuestions: readonly GiftDiscoveryAnsweredQuestion[],
  skippedQuestions: readonly string[],
): string {
  const payload = JSON.stringify({
    locale: context.locale,
    person: context.person.id,
    event: context.event.id,
    missingSignals: context.missingSignals,
    followUpCount: followUpQuestions.length,
    answered: answeredQuestions.map((answer) => answer.type),
    skipped: skippedQuestions,
  });
  return `gift-discovery-${stableHash(payload)}`;
}

function filterSkippedQuestions(
  questions: readonly GiftDiscoveryQuestion[],
  skippedQuestions: readonly string[],
): GiftDiscoveryQuestion[] {
  if (!skippedQuestions.length) return [...questions];
  const skippedIds = new Set(skippedQuestions);
  const skippedTypes = new Set(
    skippedQuestions
      .map(giftDiscoveryQuestionTypeFromId)
      .filter((item): item is GiftDiscoveryQuestionType => Boolean(item)),
  );
  return questions.filter(
    (question) => !skippedIds.has(question.id) && !skippedTypes.has(question.type),
  );
}

export function buildGiftDiscoverySession({
  context,
  followUpQuestions = [],
  answeredQuestions = [],
  skippedQuestions = [],
}: BuildGiftDiscoverySessionInput): GiftDiscoverySession {
  const sanitizedAnsweredQuestions = sanitizeAnsweredQuestions(answeredQuestions);
  const missingSignals = uniqueMissingSignals(context);
  const questions = buildQuestions(context, missingSignals, sanitizedAnsweredQuestions);
  const remainingQuestions = filterSkippedQuestions(questions, skippedQuestions);

  return {
    sessionId: sessionId(context, followUpQuestions, sanitizedAnsweredQuestions, skippedQuestions),
    questions,
    answeredQuestions: sanitizedAnsweredQuestions,
    remainingQuestions,
    completionScore: completionScore(missingSignals),
    nextRecommendedQuestion: remainingQuestions[0] ?? null,
    missingSignals,
    locale: context.locale,
  };
}

export function buildGiftDiscoveryPromptInput(
  session: GiftDiscoverySession,
): GiftDiscoveryPromptInput {
  return {
    completionScore: session.completionScore,
    nextRecommendedQuestion: session.nextRecommendedQuestion,
    remainingQuestions: session.remainingQuestions,
    answeredQuestions: session.answeredQuestions,
    missingSignals: session.missingSignals,
    locale: session.locale,
  };
}
