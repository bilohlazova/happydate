import type { EventEngineParams } from "@/lib/brain/engines/eventEngine";
import type { HomeLoaderData } from "./home.types";
import { getHomeRepositoryData } from "@/lib/repositories/home/home.repository";
import { orchestrateHomeBrains } from "./orchestrateHomeBrains";

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
  const brains = orchestrateHomeBrains(data, { currentDate, eventTranslate });
  return {
    isAuthenticated: data.isAuthenticated,
    profile: data.profile,
    authMetadataName: data.authMetadataName,
    email: data.email,
    people: data.people,
    events: data.events,
    memories: data.memories,
    pendingGiftOutcomes: data.pendingGiftOutcomes,
    knowledgeReviewPreferences: data.knowledgeReviewPreferences,
    errors: data.errors,
    personKnowledge: brains.care.personKnowledge,
    brainInsights: brains.care.brainInsights,
    assistantPeople: brains.conversation.assistantPeople,
    assistantMemories: brains.conversation.assistantMemories,
  };
}
