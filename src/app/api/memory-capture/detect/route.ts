import { NextResponse } from "next/server";
import { ASSISTANT_LOCALES, type AssistantChatLocale } from "@/lib/assistant/chatContract";
import {
  authenticateGiftRequest,
  resolveGiftAccess,
} from "@/lib/gifts/giftApiSecurity";
import {
  buildGiftRecommendationContext,
  type GiftIntelligenceKnowledgeInput,
} from "@/lib/gift-intelligence";
import { buildMemoryCaptureCandidates } from "@/lib/memory-capture";
import { shouldRunChatMemoryDetection } from "@/lib/memory-capture/chatMemoryDetectionPrecheck";
import { extractChatMemoryCandidateInputs } from "@/lib/memory-capture/extractChatMemoryCandidateInputs.server";
import {
  findOwnedGiftPerson,
  loadGiftIntelligenceSource,
} from "@/lib/repositories/giftIntelligenceRepository.server";

export const runtime = "nodejs";

type DetectBody = {
  personId?: unknown;
  userMessage?: unknown;
  locale?: unknown;
};

function safeResponse(
  status: 200 | 400 | 401 | 404 | 500,
  code?: string,
  message?: string,
) {
  return NextResponse.json(
    code ? { candidates: [], error: { code, message: message ?? code } } : { candidates: [] },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function parseLocale(value: unknown): AssistantChatLocale {
  return typeof value === "string" && ASSISTANT_LOCALES.includes(value as AssistantChatLocale)
    ? value as AssistantChatLocale
    : "pl";
}

function toKnowledgeInput(
  item: Awaited<ReturnType<typeof loadGiftIntelligenceSource>>["knowledge"][number],
): GiftIntelligenceKnowledgeInput {
  return {
    id: item.id,
    personId: item.personId,
    eventId: item.eventId,
    kind: item.kind,
    category: item.category,
    polarity: item.polarity,
    value: item.value,
    title: item.title,
    summary: item.summary,
    occurredOn: item.occurredOn,
    createdAt: item.createdAt,
    state: item.state,
    aiEligible: item.aiEligible,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as DetectBody;
    const personId = typeof body.personId === "string" ? body.personId.trim() : "";
    const userMessage = typeof body.userMessage === "string" ? body.userMessage.trim() : "";
    const locale = parseLocale(body.locale);

    if (!personId || !userMessage || userMessage.length > 1_000) {
      return safeResponse(400, "invalid_request", "Invalid memory detection request.");
    }
    if (!shouldRunChatMemoryDetection({ activePersonId: personId, userMessage })) {
      return safeResponse(200);
    }

    const access = await resolveGiftAccess(request, personId, {
      authenticate: authenticateGiftRequest,
      findOwnedPerson: findOwnedGiftPerson,
    });
    if (!access.ok) {
      return safeResponse(access.status, access.error, access.error);
    }

    const source = await loadGiftIntelligenceSource(access.person);
    const context = buildGiftRecommendationContext({
      person: {
        id: access.person.id,
        name: access.person.name,
        relationKey: access.person.relationKey,
        relationship: access.person.relation,
        gender: access.person.gender,
        birthday: access.person.birthday,
      },
      knowledge: source.knowledge.map(toKnowledgeInput),
      gifts: [],
      locale,
    });
    const extractedCandidates = await extractChatMemoryCandidateInputs({ userMessage, locale });
    const candidates = buildMemoryCaptureCandidates({
      context,
      aiResponse: { memoryCandidates: extractedCandidates },
      aiResponseSource: "chat_message",
    });

    return NextResponse.json({ candidates }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return safeResponse(500, "detection_failed", "Memory detection failed.");
  }
}
