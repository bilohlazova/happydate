import { createHash } from "node:crypto";
import type { AssistantChatLocale } from "../assistant/chatContract.ts";
import { extractHappyLearningCandidates } from "./extractHappyLearningCandidates.server.ts";
import { checkHappyLearningSemanticStatus } from "./checkHappyLearningSemanticStatus.server.ts";
import { buildSemanticMemoryProjection } from "../semantic-memory/index.ts";
import type { KnowledgeItem } from "../knowledge/index.ts";
import {
  HAPPY_LEARNING_DETECTION_SCHEMA_VERSION,
  type HappyLearningDetectV2Response,
  type HappyLearningOwnedPerson,
} from "./happyLearningDetectV2.types.ts";
import { HAPPY_LEARNING_LIMITS } from "./happyLearningSchema.ts";
import type { HappyLearningStructuredProvider } from "./happyLearning.types.ts";
import type { HappyLearningAuthContext } from "./happyLearningAccess.server.ts";
import type { HappyLearningConfirmationCandidate } from "./happyLearningDetectionToken.server.ts";
import { readBoundedJson } from "../server/readBoundedJson.ts";

const LOCALES = new Set<AssistantChatLocale>(["pl", "uk", "en", "ru", "de"]);
const REQUEST_KEYS = new Set(["personId", "userMessage", "locale"]);
const EMPTY: HappyLearningDetectV2Response = { candidates: [] };

export type HappyLearningDetectV2Dependencies = {
  authenticate(request: Request): Promise<HappyLearningAuthContext | null>;
  findOwnedPerson(auth: HappyLearningAuthContext, personId: string): Promise<HappyLearningOwnedPerson | null>;
  loadKnowledge(auth: HappyLearningAuthContext, personId: string): Promise<KnowledgeItem[]>;
  provider: HappyLearningStructuredProvider;
  checkRateLimit?: (userId: string) => Promise<boolean>;
  issueDetectionToken(userId: string, candidate: HappyLearningConfirmationCandidate): string;
};

function parseBody(value: unknown): {
  personId: string;
  userMessage: string;
  locale: AssistantChatLocale;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !REQUEST_KEYS.has(key))) return null;
  if (typeof body.personId !== "string" || typeof body.userMessage !== "string" || typeof body.locale !== "string") return null;
  const personId = body.personId.trim();
  const userMessage = body.userMessage.trim();
  if (!personId || personId.length > 100 || !userMessage || userMessage.length > HAPPY_LEARNING_LIMITS.maxMessageLength) return null;
  if (!LOCALES.has(body.locale as AssistantChatLocale)) return null;
  return { personId, userMessage, locale: body.locale as AssistantChatLocale };
}

function candidateId(personId: string, captureType: string, value: string): string {
  const digest = createHash("sha256")
    .update(`${personId}\u0000${captureType}\u0000${value.normalize("NFKC").toLocaleLowerCase()}`)
    .digest("hex")
    .slice(0, 24);
  return `happy-learning:${digest}`;
}

export async function createHappyLearningDetectV2Response(
  request: Request,
  dependencies: HappyLearningDetectV2Dependencies,
): Promise<Response> {
  const parsedBody = await readBoundedJson(request, 8 * 1024);
  if (!parsedBody.ok) {
    return Response.json(EMPTY, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const rawBody = parsedBody.value;
  const body = parseBody(rawBody);
  if (!body) return Response.json(EMPTY, { status: 400, headers: { "Cache-Control": "no-store" } });

  let auth: HappyLearningAuthContext | null;
  try {
    auth = await dependencies.authenticate(request);
  } catch {
    auth = null;
  }
  if (!auth) return Response.json(EMPTY, { status: 401, headers: { "Cache-Control": "no-store" } });

  if (dependencies.checkRateLimit) {
    try {
      if (!await dependencies.checkRateLimit(auth.userId)) {
        return Response.json(EMPTY, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
      }
    } catch {
      return Response.json(EMPTY, { status: 200, headers: { "Cache-Control": "no-store" } });
    }
  }

  let person: HappyLearningOwnedPerson | null;
  try {
    person = await dependencies.findOwnedPerson(auth, body.personId);
  } catch {
    person = null;
  }
  if (!person) return Response.json(EMPTY, { status: 404, headers: { "Cache-Control": "no-store" } });

  const result = await extractHappyLearningCandidates({
    userMessage: body.userMessage,
    locale: body.locale,
    resolvedPerson: person,
  }, dependencies.provider);
  if (!result.candidates.length) {
    return Response.json(EMPTY, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
  let knowledge: KnowledgeItem[];
  try {
    knowledge = await dependencies.loadKnowledge(auth, person.id);
  } catch {
    return Response.json(EMPTY, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
  const semanticMemory = buildSemanticMemoryProjection({
    people: [person],
    knowledge,
    currentDate: new Date(0),
  });
  const classified = result.candidates.map((candidate) => ({
    candidate,
    semantic: checkHappyLearningSemanticStatus({
      personId: person.id,
      candidate,
      knowledge,
      semanticMemory,
    }),
  })).filter(({ semantic }) => semantic.status !== "already_known");
  let responseCandidates: HappyLearningDetectV2Response["candidates"];
  try {
    responseCandidates = classified.map(({ candidate, semantic }) => {
      const confirmationCandidate: HappyLearningConfirmationCandidate = {
        id: candidateId(person.id, candidate.captureType, candidate.value),
        personId: person.id,
        captureType: candidate.captureType,
        value: candidate.value,
        polarity: candidate.polarity,
        semanticTags: candidate.semanticTags,
        evidenceText: candidate.evidenceText,
        source: "chat_message",
        schemaVersion: HAPPY_LEARNING_DETECTION_SCHEMA_VERSION,
      };
      return {
        ...candidate,
        ...confirmationCandidate,
        personName: person.name,
        source: "chat_message" as const,
        requiresConfirmation: true as const,
        authorization: "detection_only" as const,
        semanticStatus: semantic.status as "new" | "conflict",
        detectionToken: dependencies.issueDetectionToken(auth.userId, confirmationCandidate),
      };
    });
  } catch {
    return Response.json(EMPTY, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ candidates: responseCandidates }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
