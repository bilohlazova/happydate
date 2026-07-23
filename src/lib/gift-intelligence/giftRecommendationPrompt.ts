import type { GiftDiscoveryPromptInput } from "../gift-discovery";
import type { GiftRecommendationContext } from "./giftIntelligence.types.ts";

export const GIFT_RECOMMENDATION_PROMPT_VERSION = "gift-recommendation-v1";

export const giftRecommendationJsonSchema = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      minItems: 0,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          category: {
            type: "string",
            enum: [
              "experience",
              "book",
              "food_drink",
              "flowers",
              "electronics",
              "beauty",
              "home",
              "fashion",
              "subscription",
              "travel",
              "hobby",
              "other",
            ],
          },
          why: { type: "string" },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          estimatedPrice: { type: ["number", "null"] },
          currency: { type: ["string", "null"] },
          personalizationSignals: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "relation",
                "event",
                "interest",
                "preference",
                "memory",
                "previous_gift_avoidance",
                "budget",
                "season",
                "age",
                "gender",
              ],
            },
          },
          cautions: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "price_uncertain",
                "limited_context",
                "legacy_fallback",
                "verify_availability",
              ],
            },
          },
        },
        required: [
          "title",
          "category",
          "why",
          "confidence",
          "estimatedPrice",
          "currency",
          "personalizationSignals",
          "cautions",
        ],
        additionalProperties: false,
      },
    },
    followUpQuestions: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["suggestions", "followUpQuestions"],
  additionalProperties: false,
} as const;

export function buildGiftRecommendationInstructions(
  context: GiftRecommendationContext,
  discovery?: GiftDiscoveryPromptInput,
): string {
  return [
    `Prompt contract: ${GIFT_RECOMMENDATION_PROMPT_VERSION}.`,
    "You are a personal gift recommendation assistant.",
    "Use only the structured AI payload: context and discovery. Do not use outside knowledge about the person.",
    "context is GiftRecommendationContext. discovery is GiftDiscoverySession projection.",
    "Do not invent missing facts. Treat missingSignals as unknown information, not negative information.",
    "Respect context.locale for visible explanatory text in why.",
    "Keep category, confidence, personalizationSignals and cautions canonical exactly as the schema enums.",
    "Respect budget.amount and budget.currency when available. If price is uncertain, set estimatedPrice to null and add price_uncertain.",
    "Use preferences, memories, importantFacts, event, relation, age, gender and season only when present in the context.",
    "If context.discoveryAnswers is present, treat it as validated current-session input with precedence over missing repository values.",
    "Avoid every value in duplicateAvoidance.previousGiftValues and every active gift in gifts.active.",
    "Do not expose internal IDs in the response.",
    "Confidence must be evidence-based: do not return high confidence when key signals are missing.",
    "discovery.completionScore represents context completeness from 0 to 100.",
    "Lower discovery.completionScore should reduce confidence.",
    "discovery.nextRecommendedQuestion is the highest-value missing input.",
    "Recommendations may still be generated when context is incomplete.",
    "For followUpQuestions, return at most 3 canonical question IDs from discovery.remainingQuestions only.",
    "Do not write translated follow-up text. Do not invent new question types.",
    "Do not include answeredQuestions or questions about information already present in context.",
    "Preserve discovery.remainingQuestions priority order when choosing followUpQuestions.",
    `Current missingSignals: ${JSON.stringify(context.missingSignals)}.`,
    discovery
      ? `Current discovery: ${JSON.stringify({
          completionScore: discovery.completionScore,
          nextRecommendedQuestion: discovery.nextRecommendedQuestion,
          remainingQuestions: discovery.remainingQuestions,
          answeredQuestionCount: discovery.answeredQuestions.length,
          locale: discovery.locale,
        })}.`
      : "Current discovery: unavailable.",
  ].join("\n");
}

export function buildGiftRepairInstructions(): string {
  return [
    `Prompt contract: ${GIFT_RECOMMENDATION_PROMPT_VERSION}-repair.`,
    "Repair only the rejected gift recommendations.",
    "Use the same GiftRecommendationContext.",
    "Use validationErrors to avoid duplicates and budget violations.",
    "Return ONLY valid JSON matching the same schema.",
    "Do not create an unbounded retry loop; this is the only repair attempt.",
  ].join("\n");
}
