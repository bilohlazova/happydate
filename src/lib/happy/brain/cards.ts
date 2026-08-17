import { loadBrain } from "./loadBrain";
import { logOperationalWarning } from "@/lib/observability/safeLogger";
import { buildInsights } from "@/lib/brain/buildInsights";
import {
  createBirthdayCard,
  createEventCard,
  createMemoryCard,
  createMemoryCards,
  createGiftIdeaCard,
} from "./cardBuilders";
import {
  composeHomeCards,
  mapInsightToHappyCard,
  safelyBuildHomeRecommendation,
  selectHomeMemoryInsight,
} from "./mapInsightToHappyCard";

import type { HappyContext } from "../context";
import type { HappyCard } from "../types";
import type {
  BrainEvent,
  BrainPerson,
} from "@/lib/brain/types";
import type { PersonSummary } from "@/lib/repositories/people";

function nextBirthdayDate(
  person: PersonSummary,
  currentDate: Date,
): Date | null {
  if (!person.birthday || !Number.isFinite(person.birthday.getTime())) {
    return null;
  }

  const today = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  );
  const birthday = new Date(
    today.getFullYear(),
    person.birthday.getMonth(),
    person.birthday.getDate(),
  );

  if (birthday < today) birthday.setFullYear(birthday.getFullYear() + 1);
  return birthday;
}

function dateOnly(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function buildBirthdayEvents(
  people: PersonSummary[],
  currentDate: Date,
): { events: BrainEvent[]; datesById: Map<string, Date> } {
  const events: BrainEvent[] = [];
  const datesById = new Map<string, Date>();

  for (const person of people) {
    const birthday = nextBirthdayDate(person, currentDate);
    if (!birthday) continue;

    const id = `birthday-${person.id}`;
    events.push({
      id,
      title: `Urodziny ${person.firstName}`,
      date: dateOnly(birthday),
      is_important: true,
      person_name: person.firstName,
      category: "birthday",
      personId: person.id,
    });
    datesById.set(id, birthday);
  }

  return { events, datesById };
}

export async function generateMorningCards(
  context: HappyContext
): Promise<HappyCard[]> {
  const brain = await loadBrain(context);

  const cards: HappyCard[] = [];

  const [birthdayPerson] = brain.upcomingBirthdays;
  const [upcomingEvent] = brain.upcomingEvents;
  const [importantMemory] = brain.importantMemories;
  const primaryCards: HappyCard[] = [];
  const existingRecommendationCards: HappyCard[] = [];

  if (birthdayPerson) {
    primaryCards.push(createBirthdayCard(birthdayPerson));
  }

  if (upcomingEvent) {
    primaryCards.push(createEventCard(upcomingEvent));
  }

  if (importantMemory) {
    existingRecommendationCards.push(createMemoryCard(importantMemory));
  }

  if (birthdayPerson) {
    existingRecommendationCards.push(...createMemoryCards(birthdayPerson));
    existingRecommendationCards.push(createGiftIdeaCard(birthdayPerson));
  }

  const memoryRecommendation = safelyBuildHomeRecommendation(
    () => {
      const people: BrainPerson[] = brain.people.map((person) => ({
        id: person.id,
        name: person.firstName,
      }));
      const { events, datesById } = buildBirthdayEvents(
        brain.people,
        context.now,
      );
      const insights = buildInsights({
        people,
        events,
        memories: brain.importantMemories,
        currentDate: context.now,
      });
      const selectedInsight = selectHomeMemoryInsight(insights, {
        eventDatesById: datesById,
      });

      return selectedInsight
        ? mapInsightToHappyCard(selectedInsight)
        : null;
    },
    () => {
      if (process.env.NODE_ENV === "development") {
        logOperationalWarning("happy-brain", "memory-recommendation-unavailable");
      }
    },
  );

  cards.push(
    ...composeHomeCards(
      primaryCards,
      existingRecommendationCards,
      memoryRecommendation,
    ),
  );

  return cards;
}
