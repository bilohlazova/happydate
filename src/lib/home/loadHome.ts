import { buildInsights } from "@/lib/brain/buildInsights";
import type { EventEngineParams } from "@/lib/brain/engines/eventEngine";
import { buildAllPeopleKnowledge } from "@/lib/brain/engines/personKnowledgeEngine";
import type { BrainEvent } from "@/lib/brain/types";
import type { HomeLoaderData, HomeStoredEvent } from "./home.types";
import { getHomeRepositoryData } from "@/lib/repositories/home/home.repository";
import { getAiEligibleKnowledge } from "@/lib/knowledge";
import { buildAssistantPeopleContext } from "@/lib/assistant/peopleContext";
import { buildAssistantMemoryContext } from "@/lib/assistant/memoryContext";

function toBrainEvents(events: HomeStoredEvent[]): BrainEvent[] {
  return events.map((event) => {
    const category = event.category?.trim().toLowerCase() || null;
    return {
      id: event.id,
      title: event.title,
      date: event.date,
      is_important: category === "birthday" || category === "anniversary",
      person_name: null,
      category,
    };
  });
}

/**
 * Single orchestration boundary for Home consumers.
 * Repository owns I/O, Knowledge owns canonical facts, and Brain owns insights.
 */
export interface LoadHomeOptions {
  currentDate?: Date;
  eventTranslate?: EventEngineParams["translate"];
}

export async function loadHome({
  currentDate = new Date(),
  eventTranslate,
}: LoadHomeOptions = {}): Promise<HomeLoaderData> {
  const data = await getHomeRepositoryData();
  const people = data.people.map(({ id, name }) => ({ id, name }));
  const events = toBrainEvents(data.events);
  const safeKnowledge = getAiEligibleKnowledge(data.knowledge);
  const assistantPeople = data.errors.some((error) => error.section === "people")
    ? []
    : buildAssistantPeopleContext(data.people);
  return {
    isAuthenticated: data.isAuthenticated,
    profile: data.profile,
    authMetadataName: data.authMetadataName,
    email: data.email,
    people: data.people,
    events: data.events,
    memories: data.memories,
    errors: data.errors,
    personKnowledge: buildAllPeopleKnowledge({
      people,
      memories: safeKnowledge,
      currentDate,
    }),
    // Preserve current Home Assistant insight behavior while moving ownership
    // to Brain. Person Knowledge is prepared separately for future Home blocks.
    brainInsights: buildInsights({
      events,
      currentDate,
      eventTranslate,
    }),
    assistantPeople,
    assistantMemories: buildAssistantMemoryContext(assistantPeople, safeKnowledge),
  };
}
