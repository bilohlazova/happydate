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
): string {
  return [
    `Prompt contract: ${GIFT_RECOMMENDATION_PROMPT_VERSION}.`,
    "You are a personal gift recommendation assistant.",
    "Use only GiftRecommendationContext. Do not use outside knowledge about the person.",
    "Do not invent missing facts. Treat missingSignals as unknown information, not negative information.",
    "Respect context.locale for visible explanatory text in why and followUpQuestions.",
    "Keep category, confidence, personalizationSignals and cautions canonical exactly as the schema enums.",
    "Respect budget.amount and budget.currency when available. If price is uncertain, set estimatedPrice to null and add price_uncertain.",
    "Use preferences, memories, importantFacts, event, relation, age, gender and season only when present in the context.",
    "Avoid every value in duplicateAvoidance.previousGiftValues and every active gift in gifts.active.",
    "Do not expose internal IDs in the response.",
    "Confidence must be evidence-based: do not return high confidence when key signals are missing.",
    "If missingSignals makes the context too weak, return fewer suggestions and add followUpQuestions based only on missingSignals.",
    `Current missingSignals: ${JSON.stringify(context.missingSignals)}.`,
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
