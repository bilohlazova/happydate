import type { KnowledgeItem } from "../knowledge/index.ts";
import { PROFILE_NOTE_SCHEMA, type MemoryEpistemicType } from "./types.ts";

export function isProfileNote(item: KnowledgeItem): boolean {
  return item.tags.includes("profile_note")
    || item.classification?.classifierVersion === PROFILE_NOTE_SCHEMA;
}

export function knowledgeEpistemicType(item: KnowledgeItem): MemoryEpistemicType {
  if (item.kind === "journal") return "memory";
  if (isProfileNote(item) || item.kind === "note") return "memory";
  if (item.kind === "experience") return "memory";
  if (item.kind === "wish") return "memory";
  return "fact";
}

export function isUserAuthoritative(item: KnowledgeItem): boolean {
  return item.classification?.userConfirmed === true || item.evidence.sourceKind === "manual";
}
