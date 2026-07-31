import type { HappyLearningCandidate } from "./happyLearning.types.ts";

export const HAPPY_LEARNING_DETECTION_SCHEMA_VERSION = "happy-learning-detection-v2" as const;

export type HappyLearningOwnedPerson = {
  id: string;
  name: string;
};

export type HappyLearningDetectionCandidate = HappyLearningCandidate & {
  id: string;
  personId: string;
  personName: string;
  source: "chat_message";
  requiresConfirmation: true;
  schemaVersion: typeof HAPPY_LEARNING_DETECTION_SCHEMA_VERSION;
  authorization: "detection_only";
};

export type HappyLearningDetectV2Response = {
  candidates: HappyLearningDetectionCandidate[];
};
