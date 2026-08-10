import { listKnowledge } from "../repositories/knowledgeRepository.ts";
import {
  isActiveGiftIdea,
  isGiftHistory,
  mapKnowledgeToGifts,
} from "./gift.mapper.ts";
import type { GiftRecord } from "./gift.types.ts";
import {
  clearCanonicalGiftOutcome,
  createCanonicalGift,
  deleteCanonicalGift,
  deleteSavedGiftLink,
  listCanonicalGifts,
  listSavedGiftLinks,
  moveSavedGiftLink,
  saveGiftLink,
  setPreferredGiftLink,
  setCanonicalGiftLifecycle,
  setCanonicalGiftOutcome,
  setCanonicalGiftOutcomeNote,
  setCanonicalGiftOutcomeLearning,
  setCanonicalGiftOutcomeFollowUp,
  updateCanonicalGiftTitle,
} from "./gift.persistence.ts";

export {
  clearCanonicalGiftOutcome as clearGiftOutcome,
  createCanonicalGift as createGift,
  deleteCanonicalGift as deleteGift,
  deleteSavedGiftLink,
  listSavedGiftLinks,
  moveSavedGiftLink,
  saveGiftLink,
  setPreferredGiftLink,
  setCanonicalGiftLifecycle as setGiftLifecycle,
  setCanonicalGiftOutcome as setGiftOutcome,
  setCanonicalGiftOutcomeNote as setGiftOutcomeNote,
  setCanonicalGiftOutcomeLearning as setGiftOutcomeLearning,
  setCanonicalGiftOutcomeFollowUp as setGiftOutcomeFollowUp,
  updateCanonicalGiftTitle as updateGiftTitle,
};

export interface GiftRepositoryScope {
  userId: string;
  personId?: string;
  eventId?: string;
}

async function readGifts(scope: GiftRepositoryScope): Promise<GiftRecord[]> {
  const [canonical, knowledge] = await Promise.all([
    listCanonicalGifts(scope.userId),
    listKnowledge({ userId: scope.userId }),
  ]);
  return [...canonical, ...mapKnowledgeToGifts(knowledge)].filter(
    (gift) =>
      (scope.personId === undefined || gift.personId === scope.personId) &&
      (scope.eventId === undefined || gift.eventId === scope.eventId)
  ).sort((first, second) => {
    const firstDate = first.occurredOn ?? first.createdAt ?? "";
    const secondDate = second.occurredOn ?? second.createdAt ?? "";
    return secondDate.localeCompare(firstDate) || first.id.localeCompare(second.id);
  });
}

export async function loadActiveGiftIdeas(
  scope: GiftRepositoryScope
): Promise<GiftRecord[]> {
  return (await readGifts(scope)).filter(isActiveGiftIdea);
}

export async function loadGiftHistory(
  scope: GiftRepositoryScope
): Promise<GiftRecord[]> {
  return (await readGifts(scope)).filter(isGiftHistory);
}

export async function loadGiftsForPerson(
  userId: string,
  personId: string
): Promise<GiftRecord[]> {
  return readGifts({ userId, personId });
}

export async function loadCanonicalGiftsForPerson(
  userId: string,
  personId: string,
): Promise<GiftRecord[]> {
  return (await listCanonicalGifts(userId)).filter((gift) => gift.personId === personId);
}

export async function loadGiftsForEvent(
  userId: string,
  eventId: string
): Promise<GiftRecord[]> {
  return readGifts({ userId, eventId });
}

export async function loadAllGifts(userId: string): Promise<GiftRecord[]> {
  return readGifts({ userId });
}
