import { loadBrain } from "./loadBrain";
import {
  createBirthdayCard,
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

  if (!birthdayPerson) {
    return cards;
  }

  cards.push(createBirthdayCard(birthdayPerson));
  cards.push(...createMemoryCards(birthdayPerson));
  cards.push(createGiftIdeaCard(birthdayPerson));

  return cards;
}