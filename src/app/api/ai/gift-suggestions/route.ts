import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  getCachedGiftIdeas,
  findOwnedGiftPerson,
  loadGiftIntelligenceSource,
  saveGiftIdeas,
} from "@/lib/repositories/giftIntelligenceRepository.server";
import {
  authenticateGiftRequest,
  resolveGiftAccess,
} from "@/lib/gifts/giftApiSecurity";
import { mapKnowledgeToGifts } from "@/lib/gifts/gift.mapper";
import {
  applyGiftDiscoveryAnswersToContext,
  buildGiftDiscoveryPromptInput,
  buildGiftDiscoverySession,
  normalizeGiftDiscoveryRequest,
  type GiftDiscoveryPromptInput,
} from "@/lib/gift-discovery";
import {
  buildGiftRecommendationContext,
  buildGiftRecommendationInstructions,
  buildGiftRepairInstructions,
  giftRecommendationJsonSchema,
  mapSuggestionsToLegacyIdeas,
  validateGiftRecommendations,
  type GiftRecommendationAiResponse,
  type GiftRecommendationAiPayload,
} from "@/lib/gift-intelligence";
import { DEFAULT_LOCALE, normalizeLocale } from "@/i18n/config";

/* ================= TYPES ================= */

type GiftRequestBody = {
  personId?: unknown;
  occasion?: unknown;
  locale?: unknown;
  budget?: {
    amount?: unknown;
    currency?: unknown;
  } | null;
  event?: {
    id?: unknown;
    category?: unknown;
    date?: unknown;
    personId?: unknown;
  } | null;
  discoveryAnswers?: unknown;
  skippedDiscoveryQuestions?: unknown;
};

/* ================= ENV ================= */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

/* ================= CLIENTS ================= */

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

async function generateGiftRecommendations(
  payload: unknown,
  instructions: string,
): Promise<GiftRecommendationAiResponse> {
  const ai = await openai.responses.create({
    model: "gpt-4.1-mini",
    temperature: 0.8,
    instructions,
    input: JSON.stringify(payload),
    text: {
      format: {
        type: "json_schema",
        name: "gift_recommendations",
        strict: true,
        schema: giftRecommendationJsonSchema,
      },
    },
  });

  const output = ai.output_text;

  if (!output) {
    throw new Error("Empty AI output");
  }

  try {
    return JSON.parse(output) as GiftRecommendationAiResponse;
  } catch {
    throw new Error("Invalid JSON from AI");
  }
}

/* ================= ROUTE ================= */

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GiftRequestBody;

    const personId = typeof body.personId === "string" ? body.personId : undefined;
    const occasion = typeof body.occasion === "string" && body.occasion.trim()
      ? body.occasion.trim()
      : "general";
    const locale = normalizeLocale(body.locale) ?? DEFAULT_LOCALE;
    const discoveryRequest = normalizeGiftDiscoveryRequest({
      discoveryAnswers: body.discoveryAnswers,
      skippedDiscoveryQuestions: body.skippedDiscoveryQuestions,
    });
    const hasDiscoverySessionInput =
      Object.keys(discoveryRequest.answers).length > 0 ||
      discoveryRequest.skippedQuestionIds.length > 0;

    if (!personId) {
      return NextResponse.json(
        { ideas: [], error: "Missing personId" },
        { status: 400 }
      );
    }

    /* ================= CACHE CHECK ================= */

    const access = await resolveGiftAccess(req, personId, {
      authenticate: authenticateGiftRequest,
      findOwnedPerson: findOwnedGiftPerson,
    });
    if (!access.ok) {
      return NextResponse.json(
        { ideas: [], error: access.error },
        { status: access.status },
      );
    }
    const ownedPerson = access.person;

    const cached = hasDiscoverySessionInput
      ? null
      : await getCachedGiftIdeas(ownedPerson, occasion);

    if (cached) {
      return NextResponse.json({
        ideas: cached,
        cached: true,
      });
    }

    /* ================= LOAD PERSON ================= */

    const { person, knowledge } = await loadGiftIntelligenceSource(ownedPerson);
    const baseGiftRecommendationContext = buildGiftRecommendationContext({
      person: {
        id: person.id,
        name: person.name,
        relationKey: person.relationKey,
        relationship: person.relation,
        gender: person.gender,
        birthday: person.birthday,
      },
      event: {
        id: typeof body.event?.id === "string" ? body.event.id : null,
        category: typeof body.event?.category === "string" ? body.event.category : occasion,
        date: typeof body.event?.date === "string" ? body.event.date : null,
        personId: typeof body.event?.personId === "string" ? body.event.personId : person.id,
      },
      knowledge,
      gifts: mapKnowledgeToGifts(knowledge),
      budget: body.budget ? {
        amount: typeof body.budget.amount === "number" ? body.budget.amount : null,
        currency: typeof body.budget.currency === "string" ? body.budget.currency : null,
      } : null,
      locale,
    });
    const giftRecommendationContext = applyGiftDiscoveryAnswersToContext(
      baseGiftRecommendationContext,
      discoveryRequest.answers,
    );

    /* ================= PROMPT ================= */
    const giftDiscoverySession = buildGiftDiscoverySession({
      context: giftRecommendationContext,
      answeredQuestions: discoveryRequest.answeredQuestions,
      skippedQuestions: discoveryRequest.skippedQuestionIds,
    });
    const giftDiscoveryPromptInput = buildGiftDiscoveryPromptInput(giftDiscoverySession);
    const giftRecommendationPayload = {
      context: giftRecommendationContext,
      discovery: giftDiscoveryPromptInput,
    } satisfies GiftRecommendationAiPayload<GiftDiscoveryPromptInput>;

    /* ================= OPENAI ================= */

    const parsed = await generateGiftRecommendations(
      giftRecommendationPayload,
      buildGiftRecommendationInstructions(giftRecommendationContext, giftDiscoveryPromptInput),
    );
    let validated = validateGiftRecommendations(parsed, giftRecommendationContext, {
      discoverySession: giftDiscoverySession,
    });

    if (validated.suggestions.length < 5 && validated.validationErrors.length > 0) {
      const repairInput = {
        ...giftRecommendationPayload,
        validationErrors: validated.validationErrors,
        validSuggestions: validated.suggestions,
      };
      const repaired = await generateGiftRecommendations(
        repairInput,
        buildGiftRepairInstructions(),
      );
      const repairedValidated = validateGiftRecommendations(
        {
          suggestions: [...validated.suggestions, ...repaired.suggestions],
          followUpQuestions: validated.followUpQuestions.length
            ? validated.followUpQuestions
            : repaired.followUpQuestions,
        },
        giftRecommendationContext,
        {
          repairAttempted: true,
          discoverySession: giftDiscoverySession,
        },
      );
      validated = repairedValidated;
    }
    const legacyIdeas = mapSuggestionsToLegacyIdeas(validated.suggestions);

    /* ================= SAVE CACHE ================= */

    if (!hasDiscoverySessionInput) {
      await saveGiftIdeas(ownedPerson, occasion, legacyIdeas);
    }

    /* ================= RETURN ================= */

    return NextResponse.json({
      ideas: legacyIdeas,
      suggestions: validated.suggestions,
      followUpQuestions: validated.followUpQuestions,
      discovery: giftDiscoveryPromptInput,
      diagnostics: validated.diagnostics,
      cached: false,
    });
  } catch (error) {
    console.error("AI ROUTE ERROR:", error);

    return NextResponse.json(
      {
        ideas: [],
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
