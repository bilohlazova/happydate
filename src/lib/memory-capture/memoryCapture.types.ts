import type {
  GiftRecommendationAiResponse,
  GiftRecommendationContext,
} from "../gift-intelligence";
import type { GiftDiscoveryAnswers } from "../gift-discovery";

export const MEMORY_CAPTURE_CANDIDATE_TYPES = [
  "interest",
  "hobby",
  "favorite_brand",
  "disliked_gift",
  "preferred_style",
] as const;

export type MemoryCaptureCandidateType =
  (typeof MEMORY_CAPTURE_CANDIDATE_TYPES)[number];

export const MEMORY_CAPTURE_CONFIDENCE = ["low", "medium", "high"] as const;

export type MemoryCaptureConfidence = (typeof MEMORY_CAPTURE_CONFIDENCE)[number];

export type MemoryCaptureCandidateSource =
  | "discovery_answer"
  | "ai_response"
  | "chat_message";

export interface MemoryCaptureCandidate {
  id: string;
  type: MemoryCaptureCandidateType;
  value: string;
  confidence: MemoryCaptureConfidence;
  source: MemoryCaptureCandidateSource;
  requiresConfirmation: true;
}

export interface MemoryCaptureAiCandidateInput {
  type?: unknown;
  value?: unknown;
  confidence?: unknown;
  explicit?: unknown;
}

export type MemoryCaptureAiResponseInput =
  | GiftRecommendationAiResponse
  | {
      memoryCandidates?: unknown;
    }
  | unknown;

export interface BuildMemoryCaptureCandidatesInput {
  context: GiftRecommendationContext;
  discoveryAnswers?: GiftDiscoveryAnswers | null;
  aiResponse?: MemoryCaptureAiResponseInput;
  aiResponseSource?: MemoryCaptureCandidateSource;
}
