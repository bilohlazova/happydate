import type { CreateKnowledgeInput } from "../repositories/knowledgeRepository.ts";
import type { HappyLearningConfirmationCandidate } from "./happyLearningDetectionToken.server.ts";

const TYPE_MAPPING = {
  preference: { legacyType: "preference", title: "preference" },
  interest: { legacyType: "interest", title: "interest" },
  hobby: { legacyType: "hobby", title: "hobby" },
  dislike: { legacyType: "preference", title: "dislike" },
  favorite: { legacyType: "preference", title: "favorite" },
  wish: { legacyType: "dream", title: "wish" },
  personal_fact: { legacyType: "personal_fact", title: "personal_fact" },
  experience: { legacyType: "memory", title: "experience" },
  gift_idea: { legacyType: "gift", title: "gift_idea" },
} as const;

export function mapHappyLearningCandidateToKnowledgeInput(input: {
  userId: string;
  candidate: HappyLearningConfirmationCandidate;
}): CreateKnowledgeInput {
  const mapping = TYPE_MAPPING[input.candidate.captureType];
  const polarityTag = input.candidate.polarity === "likes" || input.candidate.polarity === "prefers"
    ? "like"
    : input.candidate.polarity === "dislikes" || input.candidate.polarity === "avoids"
      ? "dislike"
      : null;
  const aiTags = [...new Set([...input.candidate.semanticTags, ...(polarityTag ? [polarityTag] : [])])];
  return {
    userId: input.userId,
    personId: input.candidate.personId,
    legacyType: mapping.legacyType,
    title: mapping.title,
    value: input.candidate.value,
    content: input.candidate.evidenceText,
    source: input.candidate.source,
    importance: 1,
    aiTags,
  };
}
