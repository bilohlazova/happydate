import {
  MEMORY_CAPTURE_CANDIDATE_TYPES,
  type BuildMemoryCaptureCandidatesInput,
  type MemoryCaptureAiCandidateInput,
  type MemoryCaptureCandidate,
  type MemoryCaptureCandidateSource,
  type MemoryCaptureCandidateType,
  type MemoryCaptureConfidence,
} from "./memoryCapture.types.ts";
import type { GiftRecommendationContext } from "../gift-intelligence";

const CANDIDATE_TYPES = new Set<MemoryCaptureCandidateType>(
  MEMORY_CAPTURE_CANDIDATE_TYPES,
);
const MAX_VALUE_LENGTH = 120;

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function value(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = compact(value);
  if (!normalized) return null;
  return normalized.slice(0, MAX_VALUE_LENGTH);
}

export function normalizeMemoryCaptureValue(value: string): string {
  return compact(value)
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function stableId(
  personId: string | null,
  type: MemoryCaptureCandidateType,
  value: string,
): string {
  return [
    "memory-capture",
    personId ?? "unknown-person",
    type,
    normalizeMemoryCaptureValue(value).replace(/\s+/g, "-"),
  ].join(":");
}

function isCandidateType(value: unknown): value is MemoryCaptureCandidateType {
  return typeof value === "string" && CANDIDATE_TYPES.has(value as MemoryCaptureCandidateType);
}

function confidence(value: unknown): MemoryCaptureConfidence | null {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : null;
}

function knownValuesForType(
  context: GiftRecommendationContext,
  type: MemoryCaptureCandidateType,
): string[] {
  switch (type) {
    case "interest":
    case "hobby":
      return context.preferences.interests;
    case "favorite_brand":
      return [...context.preferences.likes, ...context.preferences.wishes];
    case "disliked_gift":
      return [
        ...context.preferences.dislikes,
        ...context.gifts.active.map((gift) => gift.value),
        ...context.gifts.previous.map((gift) => gift.value),
      ];
    case "preferred_style":
      return context.preferences.wishes;
  }
}

function alreadyKnown(
  context: GiftRecommendationContext,
  type: MemoryCaptureCandidateType,
  candidateValue: string,
): boolean {
  const normalizedCandidate = normalizeMemoryCaptureValue(candidateValue);
  if (!normalizedCandidate) return true;
  return knownValuesForType(context, type).some(
    (known) => normalizeMemoryCaptureValue(known) === normalizedCandidate,
  );
}

function pushCandidate(
  target: MemoryCaptureCandidate[],
  seen: Set<string>,
  context: GiftRecommendationContext,
  candidate: {
    type: MemoryCaptureCandidateType;
    value: string;
    confidence: MemoryCaptureConfidence;
    source: MemoryCaptureCandidateSource;
  },
): void {
  if (candidate.confidence !== "high") return;
  if (alreadyKnown(context, candidate.type, candidate.value)) return;

  const duplicateKey = `${candidate.type}:${normalizeMemoryCaptureValue(candidate.value)}`;
  if (seen.has(duplicateKey)) return;
  seen.add(duplicateKey);

  target.push({
    id: stableId(context.person.id, candidate.type, candidate.value),
    type: candidate.type,
    value: candidate.value,
    confidence: candidate.confidence,
    source: candidate.source,
    requiresConfirmation: true,
  });
}

function discoveryAnswerCandidates(
  input: BuildMemoryCaptureCandidatesInput,
): Array<{
  type: MemoryCaptureCandidateType;
  value: string;
  confidence: MemoryCaptureConfidence;
  source: MemoryCaptureCandidateSource;
}> {
  const answers = input.discoveryAnswers ?? {};
  const result: Array<{
    type: MemoryCaptureCandidateType;
    value: string;
    confidence: MemoryCaptureConfidence;
    source: MemoryCaptureCandidateSource;
  }> = [];

  const interest = value(answers.interests);
  if (interest) {
    result.push({
      type: "interest",
      value: interest,
      confidence: "high",
      source: "discovery_answer",
    });
  }

  const hobby = value(answers.hobbies);
  if (hobby) {
    result.push({
      type: "hobby",
      value: hobby,
      confidence: "high",
      source: "discovery_answer",
    });
  }

  const favoriteBrand = value(answers.favoriteBrands);
  if (favoriteBrand) {
    result.push({
      type: "favorite_brand",
      value: favoriteBrand,
      confidence: "high",
      source: "discovery_answer",
    });
  }

  const dislikedGift = value(answers.dislikedGifts);
  if (dislikedGift) {
    result.push({
      type: "disliked_gift",
      value: dislikedGift,
      confidence: "high",
      source: "discovery_answer",
    });
  }

  const preferredStyle = value(answers.preferredStyle);
  if (preferredStyle) {
    result.push({
      type: "preferred_style",
      value: preferredStyle,
      confidence: "high",
      source: "discovery_answer",
    });
  }

  return result;
}

function rawAiCandidates(aiResponse: unknown): MemoryCaptureAiCandidateInput[] {
  if (!aiResponse || typeof aiResponse !== "object") return [];
  const maybeCandidates = (aiResponse as Record<string, unknown>).memoryCandidates;
  if (!Array.isArray(maybeCandidates)) return [];
  return maybeCandidates.filter(
    (item): item is MemoryCaptureAiCandidateInput =>
      Boolean(item) && typeof item === "object",
  );
}

function aiResponseCandidates(
  input: BuildMemoryCaptureCandidatesInput,
): Array<{
  type: MemoryCaptureCandidateType;
  value: string;
  confidence: MemoryCaptureConfidence;
  source: MemoryCaptureCandidateSource;
}> {
  const result: Array<{
    type: MemoryCaptureCandidateType;
    value: string;
    confidence: MemoryCaptureConfidence;
    source: MemoryCaptureCandidateSource;
  }> = [];

  for (const candidate of rawAiCandidates(input.aiResponse)) {
    if (candidate.explicit !== true) continue;
    if (!isCandidateType(candidate.type)) continue;
    const candidateValue = value(candidate.value);
    const candidateConfidence = confidence(candidate.confidence);
    if (!candidateValue || candidateConfidence !== "high") continue;
    result.push({
      type: candidate.type,
      value: candidateValue,
      confidence: candidateConfidence,
      source: input.aiResponseSource ?? "ai_response",
    });
  }

  return result;
}

export function buildMemoryCaptureCandidates(
  input: BuildMemoryCaptureCandidatesInput,
): MemoryCaptureCandidate[] {
  const candidates: MemoryCaptureCandidate[] = [];
  const seen = new Set<string>();

  for (const candidate of [
    ...discoveryAnswerCandidates(input),
    ...aiResponseCandidates(input),
  ]) {
    pushCandidate(candidates, seen, input.context, candidate);
  }

  return candidates;
}
