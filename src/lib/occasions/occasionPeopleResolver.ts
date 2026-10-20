import type { OccasionDefinition } from "./occasion.types.ts";
import { isPersonRelevantForOccasion } from "./occasionPeoplePolicy.ts";
import type { OccasionPeopleResolution, OccasionPersonProjection } from "./occasionPeople.types.ts";

export function resolveRelevantPeopleFromProjection(input: {
  definition: OccasionDefinition;
  occurrenceKey: string;
  people: readonly OccasionPersonProjection[];
}): OccasionPeopleResolution {
  const candidates = input.people
    .filter((person) => isPersonRelevantForOccasion(input.definition, person).relevant)
    .map((person) => ({ personId: person.id, name: person.name, relationKey: person.relationKey }));

  if (candidates.length === 0) {
    return { kind: "none", occasionKey: input.definition.key, occurrenceKey: input.occurrenceKey };
  }
  if (candidates.length === 1) {
    return { kind: "resolved", occasionKey: input.definition.key, occurrenceKey: input.occurrenceKey, personId: candidates[0].personId };
  }
  return { kind: "selection_required", occasionKey: input.definition.key, occurrenceKey: input.occurrenceKey, candidates };
}
