import { buildSemanticMemoryProjection } from "../semantic-memory/index.ts";
import { checkHappyLearningSemanticStatus } from "../happy-learning/checkHappyLearningSemanticStatus.server.ts";
import { issueHappyLearningDetectionToken } from "../happy-learning/happyLearningDetectionToken.server.ts";
import {
  HAPPY_LEARNING_DETECTION_SCHEMA_VERSION,
  type HappyLearningDetectionCandidate,
  type HappyLearningOwnedPerson,
} from "../happy-learning/happyLearningDetectV2.types.ts";
import type { HappyLearningCandidate } from "../happy-learning/happyLearning.types.ts";
import type { KnowledgeItem } from "../knowledge/index.ts";
import type { MemoryCaptureCandidate, MemoryCaptureCandidateType } from "./memoryCapture.types.ts";

const TYPE_MAP = {
  interest: { captureType: "interest", polarity: "likes", semanticTags: ["interest", "like"] },
  hobby: { captureType: "hobby", polarity: "likes", semanticTags: ["hobby", "like"] },
  favorite_brand: { captureType: "favorite", polarity: "likes", semanticTags: ["brand", "like"] },
  disliked_gift: { captureType: "dislike", polarity: "dislikes", semanticTags: ["gift_failure", "dislike"] },
  preferred_style: { captureType: "preference", polarity: "prefers", semanticTags: ["preferred_style"] },
} as const satisfies Record<MemoryCaptureCandidateType, {
  captureType: HappyLearningCandidate["captureType"];
  polarity: HappyLearningCandidate["polarity"];
  semanticTags: HappyLearningCandidate["semanticTags"];
}>;

export function authorizeGiftMemoryCandidates(input: {
  userId: string;
  person: HappyLearningOwnedPerson;
  knowledge: KnowledgeItem[];
  candidates: MemoryCaptureCandidate[];
  tokenSecret: string;
  now?: number;
}): HappyLearningDetectionCandidate[] {
  if (!input.tokenSecret) return [];
  const semanticMemory = buildSemanticMemoryProjection({
    people: [input.person],
    knowledge: input.knowledge,
    currentDate: new Date(0),
  });

  return input.candidates.map((legacy): HappyLearningDetectionCandidate | null => {
    const mapping = TYPE_MAP[legacy.type];
    const candidate: HappyLearningCandidate = {
      captureType: mapping.captureType,
      value: legacy.value,
      polarity: mapping.polarity,
      semanticTags: [...mapping.semanticTags],
      evidenceText: legacy.value,
      decision: {
        statementStatus: "explicit",
        durability: "long_term",
        usefulness: "future_relevant",
        safety: "supported",
      },
      confidence: legacy.confidence === "high" ? 1 : legacy.confidence === "medium" ? 0.6 : 0.3,
    };
    const semantic = checkHappyLearningSemanticStatus({
      personId: input.person.id,
      candidate,
      knowledge: input.knowledge,
      semanticMemory,
    });
    if (semantic.status === "already_known") return null;

    const confirmation = {
      id: legacy.id,
      personId: input.person.id,
      captureType: candidate.captureType,
      value: candidate.value,
      polarity: candidate.polarity,
      semanticTags: candidate.semanticTags,
      evidenceText: candidate.evidenceText,
      source: "gift_discovery" as const,
      schemaVersion: HAPPY_LEARNING_DETECTION_SCHEMA_VERSION,
    };
    return {
      ...candidate,
      ...confirmation,
      personName: input.person.name,
      requiresConfirmation: true,
      authorization: "detection_only",
      semanticStatus: semantic.status,
      detectionToken: issueHappyLearningDetectionToken({
        userId: input.userId,
        candidate: confirmation,
        secret: input.tokenSecret,
        now: input.now,
      }),
    };
  }).filter((candidate): candidate is HappyLearningDetectionCandidate => candidate !== null);
}
