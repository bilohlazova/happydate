import { SEMANTIC_MEMORY_TAGS, type SemanticMemoryTag } from "../semantic-memory/index.ts";
import {
  HAPPY_LEARNING_CAPTURE_TYPES,
  type HappyLearningCandidate,
  type HappyLearningCaptureType,
  type HappyLearningDecision,
  type HappyLearningExtractionResult,
} from "./happyLearning.types.ts";

export const HAPPY_LEARNING_LIMITS = {
  maxCandidates: 3,
  maxMessageLength: 1_000,
  maxValueLength: 120,
  maxEvidenceLength: 240,
  maxTags: 5,
} as const;

const CAPTURE_TYPES = new Set<string>(HAPPY_LEARNING_CAPTURE_TYPES);
const POLARITIES = new Set<string>(["likes", "dislikes", "avoids", "prefers", "neutral"]);
const SEMANTIC_TAGS = new Set<string>(SEMANTIC_MEMORY_TAGS);
const STATEMENT_STATUSES = new Set(["explicit", "uncertain", "question", "inferred"]);
const DURABILITIES = new Set(["long_term", "temporary", "unknown"]);
const USEFULNESS = new Set(["future_relevant", "one_time", "unknown"]);
const SAFETY = new Set(["supported", "sensitive", "unsupported"]);
const OUTPUT_KEYS = new Set(["candidates"]);
const CANDIDATE_KEYS = new Set([
  "captureType", "value", "polarity", "semanticTags", "evidenceText", "decision", "confidence",
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

function decision(value: unknown): HappyLearningDecision | null {
  const item = record(value);
  if (!item || Object.keys(item).some((key) => !DECISION_KEYS.has(key))) return null;
  if (
    typeof item.statementStatus !== "string" || !STATEMENT_STATUSES.has(item.statementStatus)
    || typeof item.durability !== "string" || !DURABILITIES.has(item.durability)
    || typeof item.usefulness !== "string" || !USEFULNESS.has(item.usefulness)
    || typeof item.safety !== "string" || !SAFETY.has(item.safety)
  ) return null;
  return {
    statementStatus: item.statementStatus as HappyLearningDecision["statementStatus"],
    durability: item.durability as HappyLearningDecision["durability"],
    usefulness: item.usefulness as HappyLearningDecision["usefulness"],
    safety: item.safety as HappyLearningDecision["safety"],
  };
}

export function isEligibleHappyLearningDecision(value: HappyLearningDecision): boolean {
  return value.statementStatus === "explicit"
    && value.durability === "long_term"
    && value.usefulness === "future_relevant"
    && value.safety === "supported";
}

function candidate(value: unknown, userMessage: string): HappyLearningCandidate | null {
  const item = record(value);
  if (
    !item
    || Object.keys(item).some((key) => !CANDIDATE_KEYS.has(key))
    || typeof item.captureType !== "string"
    || !CAPTURE_TYPES.has(item.captureType)
  ) return null;
  const candidateValue = boundedText(item.value, HAPPY_LEARNING_LIMITS.maxValueLength);
  const evidenceText = boundedText(item.evidenceText, HAPPY_LEARNING_LIMITS.maxEvidenceLength);
  const candidateDecision = decision(item.decision);
  if (!candidateValue || !evidenceText || !candidateDecision) return null;
  if (!userMessage.includes(evidenceText) || !evidenceText.includes(candidateValue)) return null;
  const polarity = item.polarity === null
    ? null
    : typeof item.polarity === "string" && POLARITIES.has(item.polarity)
      ? item.polarity as HappyLearningCandidate["polarity"]
      : undefined;
  if (polarity === undefined) return null;
  if (!Array.isArray(item.semanticTags) || item.semanticTags.length > HAPPY_LEARNING_LIMITS.maxTags) return null;
  const semanticTags: SemanticMemoryTag[] = [];
  for (const tag of item.semanticTags) {
    if (typeof tag !== "string" || !SEMANTIC_TAGS.has(tag)) return null;
    if (!semanticTags.includes(tag as SemanticMemoryTag)) semanticTags.push(tag as SemanticMemoryTag);
  }
  const confidence = item.confidence === null || item.confidence === undefined
    ? null
    : typeof item.confidence === "number" && Number.isFinite(item.confidence)
      && item.confidence >= 0 && item.confidence <= 1
      ? item.confidence
      : undefined;
  if (confidence === undefined || !isEligibleHappyLearningDecision(candidateDecision)) return null;
  return {
    captureType: item.captureType as HappyLearningCaptureType,
    value: candidateValue,
    polarity,
    semanticTags,
    evidenceText,
    decision: candidateDecision,
    confidence,
  };
}

export function parseHappyLearningProviderOutput(
  value: unknown,
  userMessage: string,
): HappyLearningExtractionResult {
  const output = record(value);
  if (
    !output
    || Object.keys(output).some((key) => !OUTPUT_KEYS.has(key))
    || !Array.isArray(output.candidates)
  ) return { candidates: [] };
  const candidates: HappyLearningCandidate[] = [];
  for (const raw of output.candidates.slice(0, HAPPY_LEARNING_LIMITS.maxCandidates)) {
    const parsed = candidate(raw, userMessage);
    if (parsed) candidates.push(parsed);
  }
  return { candidates };
}
