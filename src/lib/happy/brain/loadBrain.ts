import { getPeople } from "@/lib/repositories/people";

import type { PersonSummary } from "@/lib/repositories/people";
import type { HappyContext } from "../context";

export interface HappyBrain {
  upcomingBirthdays: PersonSummary[];
  importantMemories: unknown[];
  recentNotes: unknown[];
  upcomingEvents: unknown[];
}

export async function loadBrain(
  _context: HappyContext
): Promise<HappyBrain> {
  const people = await getPeople();

  // TODO:
  // Відфільтрувати та відсортувати людей
  // за найближчими днями народження.
  const upcomingBirthdays = people;

  return {
    upcomingBirthdays,
    importantMemories: [],
    recentNotes: [],
    upcomingEvents: [],
  };
}