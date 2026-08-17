import { buildAssistantMemoryContextFromSemanticMemory } from "@/lib/assistant/assistantSemanticMemoryAdapter";
import { buildAssistantPeopleContext } from "@/lib/assistant/peopleContext";
import { buildInsights } from "@/lib/brain/buildInsights";
import type { EventEngineParams } from "@/lib/brain/engines/eventEngine";
import { buildAllPeopleKnowledge } from "@/lib/brain/engines/personKnowledgeEngine";
import type { BrainEvent } from "@/lib/brain/types";
import { getAiEligibleKnowledge, type KnowledgeItem } from "@/lib/knowledge";
import { orchestrateThreeBrains } from "@/lib/orchestration";
import { buildSemanticMemoryProjection } from "@/lib/semantic-memory";
import type { HomeRepositoryData, HomeStoredEvent } from "./home.types";

function toBrainEvents(events: HomeStoredEvent[]): BrainEvent[] {
  return events.map((event) => {
    const category = event.category?.trim().toLowerCase() || null;
    return {
      id: event.id,
      title: event.title,
      date: event.date,
      is_important: category === "birthday" || category === "anniversary",
      person_name: null,
      personId: event.personId,
      category,
    };
  });
}

export type HomeBrainOrchestrationOptions = {
  currentDate: Date;
  eventTranslate?: EventEngineParams["translate"];
};

/**
 * Pure Home adapter for the shared Memory → Care → Conversation contract.
 * Repository access remains in loadHome; this adapter only transforms the
 * already authenticated, owner-scoped repository result.
 */
export function orchestrateHomeBrains(
  data: HomeRepositoryData & { knowledge: KnowledgeItem[] },
  { currentDate, eventTranslate }: HomeBrainOrchestrationOptions,
) {
  return orchestrateThreeBrains(data, {
    memoryBrain(input) {
      const safeKnowledge = getAiEligibleKnowledge(input.knowledge);
      const assistantPeople = input.errors.some((error) => error.section === "people")
        ? []
        : buildAssistantPeopleContext(input.people);
      const semanticMemory = buildSemanticMemoryProjection({
        people: assistantPeople,
        knowledge: safeKnowledge,
        currentDate,
      });
      return {
        memory: { safeKnowledge, assistantPeople, semanticMemory },
        sources: safeKnowledge.map(({ id }) => ({ id, kind: "knowledge" as const })),
      };
    },
    careBrain({ memory, sources }) {
      const people = data.people.map(({ id, name }) => ({ id, name }));
      const events = toBrainEvents(data.events);
      return {
        care: {
          personKnowledge: buildAllPeopleKnowledge({
            people,
            memories: memory.safeKnowledge,
            currentDate,
          }),
          brainInsights: buildInsights({ events, currentDate, eventTranslate }),
        },
        reasonCodes: ["home_daily_context"],
        sources: [
          ...sources,
          ...events.map(({ id }) => ({ id, kind: "event" as const })),
        ],
      };
    },
    conversationBrain({ memory }) {
      return {
        conversation: {
          assistantPeople: memory.assistantPeople,
          assistantMemories: buildAssistantMemoryContextFromSemanticMemory({
            people: memory.assistantPeople,
            semanticMemory: memory.semanticMemory,
            sourceKnowledge: memory.safeKnowledge,
          }),
        },
        proposedActions: [],
      };
    },
  });
}
