import type { CreateKnowledgeInput } from "../repositories/knowledgeRepository";
import {
  MEMORY_CAPTURE_CANDIDATE_TYPES,
  type MemoryCaptureCandidate,
  type MemoryCaptureCandidateType,
} from "./memoryCapture.types.ts";

const CANDIDATE_TYPES = new Set<MemoryCaptureCandidateType>(
  MEMORY_CAPTURE_CANDIDATE_TYPES,
);
export const MEMORY_CAPTURE_SOURCE = "gift_discovery" as const;
export const MEMORY_CAPTURE_MAX_VALUE_LENGTH = 120;

export type MemoryCapturePersistenceError =
  | "unsupported_type"
  | "invalid_value"
  | "confirmation_required"
  | "invalid_person";

export type MemoryCaptureKnowledgeInputResult =
  | {
      ok: true;
      input: CreateKnowledgeInput;
    }
  | {
      ok: false;
      error: MemoryCapturePersistenceError;
    };

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeMemoryCaptureCandidateValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = compact(value);
  if (!normalized || normalized.length > MEMORY_CAPTURE_MAX_VALUE_LENGTH) return null;
  return normalized;
}

function isCandidateType(value: unknown): value is MemoryCaptureCandidateType {
  return typeof value === "string" && CANDIDATE_TYPES.has(value as MemoryCaptureCandidateType);
}

function legacyType(type: MemoryCaptureCandidateType): string {
  switch (type) {
    case "interest":
      return "interest";
    case "hobby":
      return "hobby";
    case "favorite_brand":
      return "preference";
    case "disliked_gift":
      return "preference";
    case "preferred_style":
      return "preference";
  }
}

function title(type: MemoryCaptureCandidateType): string {
  switch (type) {
    case "interest":
      return "interest";
    case "hobby":
      return "hobby";
    case "favorite_brand":
      return "favorite_brand";
    case "disliked_gift":
      return "disliked_gift";
    case "preferred_style":
      return "preferred_style";
  }
}

export function mapMemoryCaptureCandidateToKnowledgeInput({
  userId,
  personId,
  candidate,
}: {
  userId: string;
  personId: string;
  candidate: MemoryCaptureCandidate;
}): MemoryCaptureKnowledgeInputResult {
  if (!userId.trim() || !personId.trim()) {
    return { ok: false, error: "invalid_person" };
  }
  if (!candidate.requiresConfirmation) {
    return { ok: false, error: "confirmation_required" };
  }
  if (!isCandidateType(candidate.type)) {
    return { ok: false, error: "unsupported_type" };
  }
  const value = normalizeMemoryCaptureCandidateValue(candidate.value);
  if (!value) return { ok: false, error: "invalid_value" };

  return {
    ok: true,
    input: {
      userId,
      personId,
      legacyType: legacyType(candidate.type),
      title: title(candidate.type),
      value,
      content: value,
      source: MEMORY_CAPTURE_SOURCE,
      importance: 1,
    },
  };
}
