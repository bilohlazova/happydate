import { SEMANTIC_MEMORY_TAGS, type SemanticMemoryTag } from "../semantic-memory/semanticMemory.types.ts";
import { HAPPY_LEARNING_CAPTURE_TYPES, type HappyLearningDecision } from "./happyLearning.types.ts";
import {
  HAPPY_LEARNING_DETECTION_SCHEMA_VERSION,
  type HappyLearningDetectionCandidate,
  type HappyLearningDetectV2Response,
} from "./happyLearningDetectV2.types.ts";

const CAPTURE_TYPES = new Set<string>(HAPPY_LEARNING_CAPTURE_TYPES);
const SEMANTIC_TAGS = new Set<string>(SEMANTIC_MEMORY_TAGS);
const POLARITIES = new Set(["likes", "dislikes", "avoids", "prefers", "neutral"]);
const STATEMENT_STATUSES = new Set(["explicit", "uncertain", "question", "inferred"]);
const DURABILITIES = new Set(["long_term", "temporary", "unknown"]);
const USEFULNESS = new Set(["future_relevant", "one_time", "unknown"]);
const SAFETY = new Set(["supported", "sensitive", "unsupported"]);
const MAX_CANDIDATES = 3;
const RESPONSE_KEYS = new Set(["candidates"]);
const CANDIDATE_KEYS = new Set([
  "id", "personId", "personName", "captureType", "value", "polarity", "semanticTags",
  "evidenceText", "decision", "confidence", "source", "requiresConfirmation",
  "schemaVersion", "authorization", "semanticStatus",
]);
const DECISION_KEYS = new Set(["statementStatus", "durability", "usefulness", "safety"]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function boundedText(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized && normalized.length <= maximum ? normalized : null;
}

function parseDecision(value: unknown): HappyLearningDecision | null {
  const item = record(value);
  if (
    !item
    || Object.keys(item).some((key) => !DECISION_KEYS.has(key))
    || typeof item.statementStatus !== "string" || !STATEMENT_STATUSES.has(item.statementStatus)
    || typeof item.durability !== "string" || !DURABILITIES.has(item.durability)
    || typeof item.usefulness !== "string" || !USEFULNESS.has(item.usefulness)
    || typeof item.safety !== "string" || !SAFETY.has(item.safety)
  ) return null;
  return item as HappyLearningDecision;
}

function parseCandidate(value: unknown): HappyLearningDetectionCandidate | null {
  const item = record(value);
  if (!item || Object.keys(item).some((key) => !CANDIDATE_KEYS.has(key))) return null;
  const id = boundedText(item.id, 160);
  const personId = boundedText(item.personId, 160);
  const personName = boundedText(item.personName, 120);
  const candidateValue = boundedText(item.value, 120);
  const evidenceText = boundedText(item.evidenceText, 240);
  const decision = parseDecision(item.decision);
  if (
    !id || !personId || !personName || !candidateValue || !evidenceText || !decision
    || typeof item.captureType !== "string" || !CAPTURE_TYPES.has(item.captureType)
    || item.source !== "chat_message"
    || item.requiresConfirmation !== true
    || item.schemaVersion !== HAPPY_LEARNING_DETECTION_SCHEMA_VERSION
    || item.authorization !== "detection_only"
    || (item.semanticStatus !== "new" && item.semanticStatus !== "conflict")
  ) return null;
  if (item.polarity !== null && (typeof item.polarity !== "string" || !POLARITIES.has(item.polarity))) return null;
  if (!Array.isArray(item.semanticTags) || item.semanticTags.length > 5) return null;
  const semanticTags: SemanticMemoryTag[] = [];
  for (const tag of item.semanticTags) {
    if (typeof tag !== "string" || !SEMANTIC_TAGS.has(tag)) return null;
    if (!semanticTags.includes(tag as SemanticMemoryTag)) semanticTags.push(tag as SemanticMemoryTag);
  }
  if (item.confidence !== null && (
    typeof item.confidence !== "number" || !Number.isFinite(item.confidence)
    || item.confidence < 0 || item.confidence > 1
  )) return null;
  return {
    id,
    personId,
    personName,
    captureType: item.captureType as HappyLearningDetectionCandidate["captureType"],
    value: candidateValue,
    polarity: item.polarity as HappyLearningDetectionCandidate["polarity"],
    semanticTags,
    evidenceText,
    decision,
    confidence: item.confidence as number | null,
    source: "chat_message",
    requiresConfirmation: true,
    schemaVersion: HAPPY_LEARNING_DETECTION_SCHEMA_VERSION,
    authorization: "detection_only",
    semanticStatus: item.semanticStatus,
  };
}

export function parseHappyLearningDetectV2Response(value: unknown): HappyLearningDetectV2Response {
  const output = record(value);
  if (
    !output
    || Object.keys(output).some((key) => !RESPONSE_KEYS.has(key))
    || !Array.isArray(output.candidates)
  ) return { candidates: [] };
  const candidates: HappyLearningDetectionCandidate[] = [];
  for (const raw of output.candidates.slice(0, MAX_CANDIDATES)) {
    const candidate = parseCandidate(raw);
    if (candidate) candidates.push(candidate);
  }
  return { candidates };
}

export async function requestHappyLearningDetection(input: {
  personId: string;
  userMessage: string;
  locale: string;
  accessToken: string;
  signal: AbortSignal;
}, fetcher: typeof fetch = fetch): Promise<HappyLearningDetectV2Response> {
  try {
    const response = await fetcher("/api/memory-capture/detect-v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.accessToken}`,
      },
      body: JSON.stringify({
        personId: input.personId,
        userMessage: input.userMessage,
        locale: input.locale,
      }),
      cache: "no-store",
      signal: input.signal,
    });
    if (!response.ok) return { candidates: [] };
    return parseHappyLearningDetectV2Response(await response.json().catch(() => null));
  } catch {
    return { candidates: [] };
  }
}
