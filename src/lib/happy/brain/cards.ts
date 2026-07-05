import { loadBrain } from "./loadBrain";
import {
  createBirthdayCard,
  createEventCard,
  createMemoryCard,
  createMemoryCards,
  createGiftIdeaCard,
} from "./cardBuilders";

import type { HappyContext } from "../context";
import type { HappyCard } from "../types";

export async function generateMorningCards(
  context: HappyContext
): Promise<HappyCard[]> {
  const brain = await loadBrain(context);

  const cards: HappyCard[] = [];

  const [birthdayPerson] = brain.upcomingBirthdays;
  const [upcomingEvent] = brain.upcomingEvents;
  const [importantMemory] = brain.importantMemories;

  if (birthdayPerson) {
    cards.push(createBirthdayCard(birthdayPerson));
  }

  if (upcomingEvent) {
    cards.push(createEventCard(upcomingEvent));
  }

  if (importantMemory) {
    cards.push(createMemoryCard(importantMemory));
  }

  if (birthdayPerson) {
    cards.push(...createMemoryCards(birthdayPerson));
    cards.push(createGiftIdeaCard(birthdayPerson));
  }

  return cards;
}
