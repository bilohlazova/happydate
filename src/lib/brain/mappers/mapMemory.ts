import type { BrainMemory } from "../types";
import type { MemoryRow } from "@/lib/repositories/memory.types";

export function mapMemory(row: MemoryRow): BrainMemory {
  return {
    id: row.id,
    personId: row.person_id,
    type: row.type,
    title: row.title,
    value: row.value_text,
    content: row.content_text,
    importance: row.importance,
    occurredOn: row.occurred_on,
    createdAt: row.created_at,
    isActive: row.is_active,
    eventId: row.event_id,
  };
}
