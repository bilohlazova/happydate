import {
  buildPersonKnowledgeFromSemanticMemory,
  type BuildPersonKnowledgeFromSemanticMemoryInput,
} from "../brainSemanticMemoryAdapter.ts";
import type { BrainPerson, PersonKnowledge } from "../types.ts";
import type { KnowledgeItem } from "../../knowledge/index.ts";

export {
  PERSON_KNOWLEDGE_COMPLETENESS_WEIGHTS,
  calculatePersonKnowledgeCompleteness,
  countPersonKnownFacts,
  extractPersonKnowledgeValue,
} from "../brainSemanticMemoryAdapter.ts";

export interface BuildPersonKnowledgeInput {
  person: BrainPerson;
  memories: KnowledgeItem[];
  currentDate?: Date;
}

export interface BuildAllPeopleKnowledgeInput {
  people: BrainPerson[];
  memories: KnowledgeItem[];
  currentDate?: Date;
}

export function buildPersonKnowledge({
  person,
  memories,
  currentDate,
}: BuildPersonKnowledgeInput): PersonKnowledge {
  const input: BuildPersonKnowledgeFromSemanticMemoryInput = {
    person,
    knowledge: memories,
    currentDate,
  };
  return buildPersonKnowledgeFromSemanticMemory(input);
}

export function buildAllPeopleKnowledge({
  people,
  memories,
  currentDate,
}: BuildAllPeopleKnowledgeInput): PersonKnowledge[] {
  const memoriesByPerson = new Map<string, KnowledgeItem[]>();
  for (const memory of memories) {
    if (!memory.personId) continue;
    const group = memoriesByPerson.get(memory.personId) ?? [];
    group.push(memory);
    memoriesByPerson.set(memory.personId, group);
  }
  return people.map((person) =>
    buildPersonKnowledge({
      person,
      memories: memoriesByPerson.get(person.id) ?? [],
      currentDate,
    }),
  );
}
