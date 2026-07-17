import { getPeople } from "@/lib/repositories/people";
import { getEvents } from "@/lib/repositories/events";
import {
  getCurrentMemoryUserId,
} from "@/lib/repositories/memoryRepository";
import { listKnowledge } from "@/lib/repositories/knowledgeRepository";

import type { PersonSummary } from "@/lib/repositories/people";
import type { EventSummary } from "@/lib/repositories/events";
import { consumerIsActive, type KnowledgeItem } from "@/lib/knowledge";
import type { HappyContext } from "../context";

export interface HappyBrain {
  people: PersonSummary[];
  upcomingBirthdays: PersonSummary[];
  importantMemories: KnowledgeItem[];
  recentNotes: unknown[];
  upcomingEvents: EventSummary[];
}

function getDaysUntilBirthday(
  birthday: Date,
  now: Date
): number {
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const nextBirthday = new Date(
    today.getFullYear(),
    birthday.getMonth(),
    birthday.getDate()
  );

  if (nextBirthday < today) {
    nextBirthday.setFullYear(
      nextBirthday.getFullYear() + 1
    );
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round(
    (nextBirthday.getTime() - today.getTime()) /
      millisecondsPerDay
  );
}

function getMemoryCreatedAtValue(memory: KnowledgeItem): number {
  if (!memory.createdAt) {
    return 0;
  }

  return new Date(memory.createdAt).getTime();
}

async function getMemoriesForCurrentUser(): Promise<KnowledgeItem[]> {
  try {
    const userId = await getCurrentMemoryUserId();
    if (!userId) return [];

    const memories = await listKnowledge({ userId });

    return memories
      .filter(consumerIsActive)
      .sort((firstMemory, secondMemory) => {
        if (firstMemory.importance !== secondMemory.importance) {
          return secondMemory.importance - firstMemory.importance;
        }

        return (
          getMemoryCreatedAtValue(secondMemory) -
          getMemoryCreatedAtValue(firstMemory)
        );
      });
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.warn("[happy.loadBrain] Memory data unavailable.");
    }
    return [];
  }
}

export async function loadBrain(
  context: HappyContext
): Promise<HappyBrain> {
  const [people, events, memories] = await Promise.all([
    getPeople(),
    getEvents(),
    getMemoriesForCurrentUser(),
  ]);

  const upcomingBirthdays = people
    .filter((person) => person.birthday)
    .sort((firstPerson, secondPerson) => {
      const firstBirthday = firstPerson.birthday;
      const secondBirthday = secondPerson.birthday;

      if (!firstBirthday || !secondBirthday) {
        return 0;
      }

      return (
        getDaysUntilBirthday(firstBirthday, context.now) -
        getDaysUntilBirthday(secondBirthday, context.now)
      );
    });

  const today = new Date(
    context.now.getFullYear(),
    context.now.getMonth(),
    context.now.getDate()
  );

  const upcomingEvents = events
    .filter((event) => event.date >= today)
    .sort(
      (firstEvent, secondEvent) =>
        firstEvent.date.getTime() -
        secondEvent.date.getTime()
    );

  return {
    people,
    upcomingBirthdays,
    importantMemories: memories,
    recentNotes: [],
    upcomingEvents,
  };
}
