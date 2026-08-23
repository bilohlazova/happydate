import { normalizeStoredMemoryType, type NotesMemoryPerson, type NotesMemoryRow } from "../repositories/memory.types.ts";

export type MemoryThread =
  | { id: string; kind: "person"; sourceIds: string[]; personId: string; personName: string }
  | { id: string; kind: "topic"; sourceIds: string[]; topic: string }
  | { id: string; kind: "gift"; sourceIds: string[] };

function cleanTopic(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Builds explainable threads only when at least two stored records support them. */
export function buildMemoryThreads(
  memories: readonly NotesMemoryRow[],
  people: readonly NotesMemoryPerson[],
  limit = 6,
): MemoryThread[] {
  const threads: MemoryThread[] = [];
  const personById = new Map(people.map((person) => [person.id, person]));
  const recordsByPerson = new Map<string, string[]>();
  const recordsByTopic = new Map<string, { label: string; ids: string[] }>();

  for (const memory of memories) {
    if (memory.person_id && personById.has(memory.person_id)) {
      const ids = recordsByPerson.get(memory.person_id) ?? [];
      ids.push(memory.id);
      recordsByPerson.set(memory.person_id, ids);
    }
    for (const rawTag of memory.ai_tags ?? []) {
      const label = cleanTopic(rawTag);
      if (!label) continue;
      const key = label.toLocaleLowerCase();
      const current = recordsByTopic.get(key) ?? { label, ids: [] };
      if (!current.ids.includes(memory.id)) current.ids.push(memory.id);
      recordsByTopic.set(key, current);
    }
  }

  for (const [personId, sourceIds] of recordsByPerson) {
    const person = personById.get(personId);
    if (!person || sourceIds.length < 2) continue;
    threads.push({
      id: `person:${personId}`,
      kind: "person",
      sourceIds,
      personId,
      personName: person.name,
    });
  }

  for (const [key, topic] of recordsByTopic) {
    if (topic.ids.length < 2) continue;
    threads.push({ id: `topic:${key}`, kind: "topic", sourceIds: topic.ids, topic: topic.label });
  }

  const giftSourceIds = memories
    .filter((memory) => normalizeStoredMemoryType(memory.type) === "gift")
    .map((memory) => memory.id);
  if (giftSourceIds.length >= 2) {
    threads.push({ id: "gift:ideas", kind: "gift", sourceIds: giftSourceIds });
  }

  return threads
    .sort((first, second) => second.sourceIds.length - first.sourceIds.length || first.id.localeCompare(second.id))
    .slice(0, Math.max(0, limit));
}
