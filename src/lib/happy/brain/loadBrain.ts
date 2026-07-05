import { getPeople } from "@/lib/repositories/people";
import { getEvents } from "@/lib/repositories/events";

import type { PersonSummary } from "@/lib/repositories/people";
import type { EventSummary } from "@/lib/repositories/events";
import type { HappyContext } from "../context";

export interface HappyBrain {
  upcomingBirthdays: PersonSummary[];
  importantMemories: unknown[];
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

export async function loadBrain(
  context: HappyContext
): Promise<HappyBrain> {
  const [people, events] = await Promise.all([
    getPeople(),
    getEvents(),
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
    upcomingBirthdays,
    importantMemories: [],
    recentNotes: [],
    upcomingEvents,
  };
}
