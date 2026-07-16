import { getPeople } from "@/lib/repositories/people";
import { getEvents } from "@/lib/repositories/events";
import {
  getActiveMemories,
  getCurrentMemoryUserId,
} from "@/lib/repositories/memoryRepository";
import { mapMemory } from "@/lib/brain/mappers/mapMemory";

import type { PersonSummary } from "@/lib/repositories/people";
import type { EventSummary } from "@/lib/repositories/events";
import type { BrainMemory } from "@/lib/brain/types";
import type { MemoryRow } from "@/lib/repositories/memory.types";
import type { HappyContext } from "../context";

export interface HappyBrain {
  people: PersonSummary[];
  upcomingBirthdays: PersonSummary[];
  importantMemories: BrainMemory[];
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

function getMemoryCreatedAtValue(memory: MemoryRow): number {
  if (!memory.created_at) {
    return 0;
  }

  return new Date(memory.created_at).getTime();
}

async function getMemoriesForCurrentUser(): Promise<BrainMemory[]> {
  try {
    const userId = await getCurrentMemoryUserId();
    if (!userId) return [];

    const memories = await getActiveMemories(userId);

    return memories
      .filter((memory) => memory.is_active)
      .sort((firstMemory, secondMemory) => {
        if (firstMemory.importance !== secondMemory.importance) {
          return secondMemory.importance - firstMemory.importance;
        }

        return (
          getMemoryCreatedAtValue(secondMemory) -
          getMemoryCreatedAtValue(firstMemory)
        );
      })
      .map(mapMemory);
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
