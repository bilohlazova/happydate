import { listKnowledge } from "../repositories/knowledgeRepository.ts";
import {
  isActiveGiftIdea,
  isGiftHistory,
  mapKnowledgeToGifts,
} from "./gift.mapper.ts";
import type { GiftRecord } from "./gift.types.ts";

export interface GiftRepositoryScope {
  userId: string;
  personId?: string;
  eventId?: string;
}

async function readGifts(scope: GiftRepositoryScope): Promise<GiftRecord[]> {
  const knowledge = await listKnowledge({ userId: scope.userId });
  return mapKnowledgeToGifts(knowledge).filter(
    (gift) =>
      (scope.personId === undefined || gift.personId === scope.personId) &&
      (scope.eventId === undefined || gift.eventId === scope.eventId)
  );
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

export async function loadGiftsForEvent(
  userId: string,
  eventId: string
): Promise<GiftRecord[]> {
  return readGifts({ userId, eventId });
}

export async function loadAllGifts(userId: string): Promise<GiftRecord[]> {
  return readGifts({ userId });
}

