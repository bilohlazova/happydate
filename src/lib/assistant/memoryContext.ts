import { ASSISTANT_CHAT_CONFIG } from "./chatConfig.ts";
import type { AssistantMemoryGroupContext, AssistantPersonContext } from "./chatContract.ts";
import {
  consumerContent,
  consumerIsActive,
  consumerValue,
  type KnowledgeItem,
} from "../knowledge/index.ts";

function normalizedText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized || null;
}

function dateOrder(memory: KnowledgeItem): number {
  const value = memory.occurredOn || memory.createdAt;
  if (!value) return Number.NEGATIVE_INFINITY;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

export function buildAssistantMemoryContext(
  people: AssistantPersonContext[],
  memories: KnowledgeItem[],
): AssistantMemoryGroupContext[] {
  const activeByPerson = new Map<string, Array<{ memory: KnowledgeItem; sourceIndex: number }>>();
  memories.forEach((memory, sourceIndex) => {
    if (!consumerIsActive(memory) || memory.aiEligible === false || !memory.personId) return;
    const content = normalizedText(consumerValue(memory)) ?? normalizedText(consumerContent(memory)) ?? normalizedText(memory.title);
    if (!content) return;
    const current = activeByPerson.get(memory.personId) ?? [];
    current.push({ memory, sourceIndex });
    activeByPerson.set(memory.personId, current);
  });

  let total = 0;
  const groups: AssistantMemoryGroupContext[] = [];
  for (const person of people) {
    if (groups.length >= ASSISTANT_CHAT_CONFIG.maxMemoryPeople || total >= ASSISTANT_CHAT_CONFIG.maxMemoriesTotal) break;
    const personMemories = (activeByPerson.get(person.id) ?? [])
      .sort((first, second) => {
        if (first.memory.importance !== second.memory.importance) {
          return second.memory.importance - first.memory.importance;
        }
        const byDate = dateOrder(second.memory) - dateOrder(first.memory);
        return byDate || first.sourceIndex - second.sourceIndex;
      })
      .slice(0, Math.min(
        ASSISTANT_CHAT_CONFIG.maxMemoriesPerPerson,
        ASSISTANT_CHAT_CONFIG.maxMemoriesTotal - total,
      ))
      .map(({ memory }) => ({
        title: normalizedText(memory.title),
        content: normalizedText(consumerValue(memory)) ?? normalizedText(consumerContent(memory)) ?? normalizedText(memory.title)!,
        occurredOn: normalizedText(memory.occurredOn),
        importance: Number.isFinite(memory.importance) ? memory.importance : null,
      }));
    if (!personMemories.length) continue;
    groups.push({ personName: person.name, memories: personMemories });
    total += personMemories.length;
  }
  return groups;
}
