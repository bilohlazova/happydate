import "server-only";
import {
  findOwnedGiftPerson,
  loadGiftIntelligenceSource,
  saveGiftIdeas,
} from "@/lib/repositories/giftIntelligenceRepository.server";
import { normalizeGiftDiscoveryRequest } from "@/lib/gift-discovery";
import {
  boundedString,
  GIFT_AI_TIMEOUT_MS,
  runGiftRecommendationPipeline,
} from "@/lib/gift-intelligence/giftRecommendationService.server";
import type { AppLocale } from "@/i18n/config";
import { AiExecutionError } from "./aiExecutionError";
import { logOperationalWarning } from "@/lib/observability/safeLogger";

export const SUGGEST_GIFTS_TOOL_NAME = "suggest_gifts";

/**
 * Chat-side entry to the one Gift Intelligence pipeline. The model may only
 * choose the occasion and an optional budget; the recipient is always the
 * server-verified active person and never an argument.
 */
export const SUGGEST_GIFTS_TOOL = {
  type: "function" as const,
  function: {
    name: SUGGEST_GIFTS_TOOL_NAME,
    description:
      "Generate fresh, personalised gift ideas for the ACTIVE PERSON using the same engine as the gift page (confirmed memories, pets, notes, past gift feedback, previous gifts). Call it when the user wants gift ideas and you have enough to start; budget and occasion are optional. Present the returned ideas in your own words and add your judgement.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        occasion: { type: ["string", "null"], maxLength: 80 },
        budget_amount: { type: ["number", "null"] },
        budget_currency: { type: ["string", "null"], maxLength: 12 },
      },
      required: ["occasion", "budget_amount", "budget_currency"],
      additionalProperties: false,
    },
  },
};

export type SuggestGiftsArgs = { occasion?: unknown; budget_amount?: unknown; budget_currency?: unknown };

export function parseSuggestGiftsArgs(raw: string): SuggestGiftsArgs {
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? value as SuggestGiftsArgs : {};
  } catch {
    return {};
  }
}

/** Returns the JSON string handed back to the model as the tool result. */
export async function runSuggestGiftsTool(input: {
  userId: string;
  personId: string;
  locale: AppLocale;
  args: SuggestGiftsArgs;
  eventId?: string | null;
  signal?: AbortSignal;
}): Promise<string> {
  try {
    const ownedPerson = await findOwnedGiftPerson(input.userId, input.personId);
    if (!ownedPerson) return JSON.stringify({ error: "person_not_available" });
    const source = await loadGiftIntelligenceSource(ownedPerson);
    const occasion = boundedString(input.args.occasion, 80) ?? "general";
    const amount = typeof input.args.budget_amount === "number" && Number.isFinite(input.args.budget_amount)
      && input.args.budget_amount >= 0 && input.args.budget_amount <= 1_000_000_000
        ? input.args.budget_amount
        : null;
    const result = await runGiftRecommendationPipeline({
      ownedPerson,
      source,
      locale: input.locale,
      occasion,
      event: input.eventId ? { id: input.eventId, category: occasion, personId: ownedPerson.id } : null,
      budget: amount === null ? null : { amount, currency: boundedString(input.args.budget_currency, 12) },
      discoveryRequest: normalizeGiftDiscoveryRequest({}),
      surface: "chat",
      signal: input.signal ?? AbortSignal.timeout(GIFT_AI_TIMEOUT_MS),
    });
    // Keeps the gift page and the chat on the same set of shown ideas.
    await saveGiftIdeas(ownedPerson, occasion, input.locale, result.ideas).catch(() => {
      logOperationalWarning("assistant-chat", "gift-tool-cache-skipped");
    });
    return JSON.stringify({
      ideas: result.suggestions.map((idea) => ({
        title: idea.title,
        why: idea.why,
        category: idea.category,
        estimatedPrice: idea.estimatedPrice,
        currency: idea.currency,
        confidence: idea.confidence,
        cautions: idea.cautions,
        offer: idea.offer
          ? { productName: idea.offer.productName, merchant: idea.offer.merchant, url: idea.offer.url, price: idea.offer.price, currency: idea.offer.currency, checkedAt: idea.offer.checkedAt, urlOrigin: idea.offer.provenance.origin, availability: idea.offer.provenance.availability, productConfirmation: idea.offer.provenance.productConfirmation, priceFreshness: idea.offer.provenance.priceFreshness }
          : null,
      })),
      note: "estimatedPrice is a model estimate. An offer, when present, is a real product page found by live web search at checkedAt: share its link and price, and tell the user to check the current price and stock before buying. Ideas without an offer have no verified product.",
    });
  } catch (error) {
    if (error instanceof AiExecutionError && (error.code === "daily_ai_budget_exceeded" || error.code === "rate_limited")) {
      return JSON.stringify({ error: error.code });
    }
    logOperationalWarning("assistant-chat", "gift-tool-failed");
    return JSON.stringify({ error: "gift_tool_unavailable" });
  }
}
