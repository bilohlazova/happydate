import type { HomeRepositoryResult } from "@/lib/repositories/home/home.repository";
import type { AssistantGiftContext } from "./chatContract";
import { orchestrateHomeBrains } from "@/lib/home/orchestrateHomeBrains";

export type HappyPersonContext = AssistantGiftContext;

/** Builds the stable Person → Happy projection from already loaded, owner-scoped data. */
export function buildHappyPersonContext(data: HomeRepositoryResult, event: { id: string; source: "birthday" | "event"; date: string; daysUntil: number; personId: string | null } | null, now = new Date()): HappyPersonContext | null {
  const brains = orchestrateHomeBrains(data, { currentDate: now });
  const person = event?.personId
    ? brains.conversation.assistantPeople.find((item) => item.id === event.personId) ?? null
    : null;
  const memories = person ? brains.conversation.assistantMemories.filter((group) => group.personName === person.name) : [];
  const previousGifts = data.giftHistory?.filter((gift) => gift.personId === event?.personId)
    .map((gift) => `${gift.title} — ${gift.lifecycle}`)
    ?? data.pendingGiftOutcomes
      .filter((gift) => !event?.personId || gift.personId === event.personId)
      .map((gift) => `${gift.title} — given`);
  if (!person || !event?.personId) return null;
  return {
    personId: person.id, personName: person.name, relationship: person.relation, birthday: person.birthday,
    eventId: event.id, eventType: event.source, eventDate: event.date, daysRemaining: event.daysUntil,
    memories: memories.flatMap((group) => group.memories), previousGifts,
  };
}
