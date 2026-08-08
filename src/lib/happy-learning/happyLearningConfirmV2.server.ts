import type { KnowledgeItem } from "../knowledge/index.ts";
import type { CreateKnowledgeInput } from "../repositories/knowledgeRepository.ts";
import { buildSemanticMemoryProjection } from "../semantic-memory/index.ts";
import { checkHappyLearningSemanticStatus } from "./checkHappyLearningSemanticStatus.server.ts";
import type { HappyLearningAuthContext } from "./happyLearningAccess.server.ts";
import type { HappyLearningOwnedPerson } from "./happyLearningDetectV2.types.ts";
import { HAPPY_LEARNING_DETECTION_SCHEMA_VERSION } from "./happyLearningDetectV2.types.ts";
import { HAPPY_LEARNING_CAPTURE_TYPES, type HappyLearningCandidate } from "./happyLearning.types.ts";
import { HAPPY_LEARNING_LIMITS } from "./happyLearningSchema.ts";
import { SEMANTIC_MEMORY_TAGS, type SemanticMemoryTag } from "../semantic-memory/semanticMemory.types.ts";
import { mapHappyLearningCandidateToKnowledgeInput } from "./mapHappyLearningCandidateToKnowledgeInput.ts";
import { verifyHappyLearningDetectionToken, type HappyLearningConfirmationCandidate } from "./happyLearningDetectionToken.server.ts";

const BODY_KEYS = new Set(["detectionToken", "candidate"]);
const CANDIDATE_KEYS = new Set(["id", "personId", "captureType", "value", "polarity", "semanticTags", "evidenceText", "source", "schemaVersion"]);
const TYPES = new Set<string>(HAPPY_LEARNING_CAPTURE_TYPES);
const TAGS = new Set<string>(SEMANTIC_MEMORY_TAGS);
const POLARITIES = new Set(["likes", "dislikes", "avoids", "prefers", "neutral"]);

export type HappyLearningConfirmDependencies = {
  authenticate(request: Request): Promise<HappyLearningAuthContext | null>;
  findOwnedPerson(auth: HappyLearningAuthContext, personId: string): Promise<HappyLearningOwnedPerson | null>;
  loadKnowledge(auth: HappyLearningAuthContext, personId: string): Promise<KnowledgeItem[]>;
  persist(input: CreateKnowledgeInput): Promise<{ id: string }>;
  tokenSecret: string;
  now?: number;
  checkRateLimit?: (userId: string) => Promise<boolean>;
};

function parseCandidate(value: unknown): HappyLearningConfirmationCandidate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).some((key) => !CANDIDATE_KEYS.has(key))) return null;
  const text = (input: unknown, max: number) => typeof input === "string" && input.trim() && input.trim().length <= max ? input.trim() : null;
  const id = text(raw.id, 160);
  const personId = text(raw.personId, 160);
  const candidateValue = text(raw.value, HAPPY_LEARNING_LIMITS.maxValueLength);
  const evidenceText = text(raw.evidenceText, HAPPY_LEARNING_LIMITS.maxEvidenceLength);
  if (!id || !personId || !candidateValue || !evidenceText || raw.schemaVersion !== HAPPY_LEARNING_DETECTION_SCHEMA_VERSION) return null;
  if (raw.source !== "chat_message" && raw.source !== "gift_discovery") return null;
  if (typeof raw.captureType !== "string" || !TYPES.has(raw.captureType)) return null;
  if (raw.polarity !== null && (typeof raw.polarity !== "string" || !POLARITIES.has(raw.polarity))) return null;
  if (!Array.isArray(raw.semanticTags) || raw.semanticTags.length > HAPPY_LEARNING_LIMITS.maxTags) return null;
  const semanticTags: SemanticMemoryTag[] = [];
  for (const tag of raw.semanticTags) {
    if (typeof tag !== "string" || !TAGS.has(tag) || semanticTags.includes(tag as SemanticMemoryTag)) return null;
    semanticTags.push(tag as SemanticMemoryTag);
  }
  return { id, personId, captureType: raw.captureType as HappyLearningConfirmationCandidate["captureType"], value: candidateValue, polarity: raw.polarity as HappyLearningConfirmationCandidate["polarity"], semanticTags, evidenceText, source: raw.source, schemaVersion: HAPPY_LEARNING_DETECTION_SCHEMA_VERSION };
}

function response(body: object, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function createHappyLearningConfirmV2Response(request: Request, deps: HappyLearningConfirmDependencies): Promise<Response> {
  let raw: unknown;
  try { raw = await request.json(); } catch { return response({ ok: false, error: "stale_candidate" }, 400); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).some((key) => !BODY_KEYS.has(key))) return response({ ok: false, error: "stale_candidate" }, 400);
  const body = raw as Record<string, unknown>;
  const candidate = parseCandidate(body.candidate);
  if (typeof body.detectionToken !== "string" || !candidate) return response({ ok: false, error: "stale_candidate" }, 400);
  const verified = verifyHappyLearningDetectionToken({ token: body.detectionToken, candidate, secret: deps.tokenSecret, now: deps.now });
  if (!verified.ok) return response({ ok: false, error: verified.error }, 401);
  const auth = await deps.authenticate(request).catch(() => null);
  if (!auth) return response({ ok: false, error: "invalid_token" }, 401);
  if (verified.claims.userId !== auth.userId) return response({ ok: false, error: "invalid_token" }, 403);
  if (verified.claims.personId !== candidate.personId) return response({ ok: false, error: "stale_candidate" }, 400);
  if (deps.checkRateLimit && !await deps.checkRateLimit(auth.userId).catch(() => false)) return response({ ok: false, error: "rate_limited" }, 429);
  const person = await deps.findOwnedPerson(auth, candidate.personId).catch(() => null);
  if (!person) return response({ ok: false, error: "person_not_found" }, 404);
  let knowledge: KnowledgeItem[];
  try { knowledge = await deps.loadKnowledge(auth, person.id); } catch { return response({ ok: false, error: "save_failed" }, 500); }
  const semantic = checkHappyLearningSemanticStatus({
    personId: person.id,
    candidate: {
      ...candidate,
      decision: { statementStatus: "explicit", durability: "long_term", usefulness: "future_relevant", safety: "supported" },
      confidence: null,
    } satisfies HappyLearningCandidate,
    knowledge,
    semanticMemory: buildSemanticMemoryProjection({ people: [person], knowledge, currentDate: new Date(0) }),
  });
  if (semantic.status === "already_known") return response({ ok: true, status: "already_known", knowledgeId: null });
  if (semantic.status === "conflict") return response({ ok: false, error: "conflict" }, 409);
  try {
    const created = await deps.persist(mapHappyLearningCandidateToKnowledgeInput({ userId: auth.userId, candidate }));
    return response({ ok: true, status: "created", knowledgeId: created.id });
  } catch {
    return response({ ok: false, error: "save_failed" }, 500);
  }
}
