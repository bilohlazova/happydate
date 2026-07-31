import { createHash } from "node:crypto";
import type { AssistantChatLocale } from "../assistant/chatContract.ts";
import { extractHappyLearningCandidates } from "./extractHappyLearningCandidates.server.ts";
import {
  HAPPY_LEARNING_DETECTION_SCHEMA_VERSION,
  type HappyLearningDetectV2Response,
  type HappyLearningOwnedPerson,
} from "./happyLearningDetectV2.types.ts";
import { HAPPY_LEARNING_LIMITS } from "./happyLearningSchema.ts";
import type { HappyLearningStructuredProvider } from "./happyLearning.types.ts";
import type { HappyLearningAuthContext } from "./happyLearningAccess.server.ts";

const LOCALES = new Set<AssistantChatLocale>(["pl", "uk", "en", "ru", "de"]);
const REQUEST_KEYS = new Set(["personId", "userMessage", "locale"]);
const EMPTY: HappyLearningDetectV2Response = { candidates: [] };

export type HappyLearningDetectV2Dependencies = {
  authenticate(request: Request): Promise<HappyLearningAuthContext | null>;
  findOwnedPerson(auth: HappyLearningAuthContext, personId: string): Promise<HappyLearningOwnedPerson | null>;
  provider: HappyLearningStructuredProvider;
  checkRateLimit?: (userId: string) => Promise<boolean>;
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
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json(EMPTY, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
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
  return Response.json({
    candidates: result.candidates.map((candidate) => ({
      ...candidate,
      id: candidateId(person.id, candidate.captureType, candidate.value),
      personId: person.id,
      personName: person.name,
      source: "chat_message" as const,
      requiresConfirmation: true as const,
      schemaVersion: HAPPY_LEARNING_DETECTION_SCHEMA_VERSION,
      authorization: "detection_only" as const,
    })),
  }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
