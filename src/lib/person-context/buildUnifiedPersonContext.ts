import type { KnowledgeItem } from "../knowledge/index.ts";
import type { PersonSymbolRow } from "../repositories/personSymbolRepository.ts";
import { buildPersonMemoryProfile } from "../memory-engine/personMemoryProfile.ts";
import { formatPersonMemoryProfileForAssistant } from "../memory-engine/assistantFormat.ts";
import type { PersonMemoryProfile } from "../memory-engine/types.ts";

/**
 * One canonical view of a single person for every AI entry point (chat, gifts,
 * agent). Callers load the raw inputs once through their own trusted boundary;
 * this pure module decides what Happy "knows" so that the same facts reach every
 * surface and are labelled with the same epistemic types.
 */
export type UnifiedPersonContextInput = {
  personId: string;
  personName: string;
  relationLabel?: string | null;
  birthday?: string | null;
  knowledge: readonly KnowledgeItem[];
  symbol?: PersonSymbolRow | null;
  pets?: Array<{ name: string; species: string; note: string | null }>;
  happyConversations?: Array<{ id: string; userMessage: string; happyResponse: string; createdAt: string }>;
  locale?: "uk" | "en";
};

/** Compact, JSON-safe slice for structured AI payloads (gift intelligence). */
export type PersonProfileForStructuredAi = {
  name: string;
  userMeaning: string | null;
  pets: Array<{ name: string; species: string }>;
  notes: string[];
  facts: string[];
  /** Latest things the USER said about this person in chat. Happy's own replies are excluded. */
  recentUserStatements: string[];
};

export type UnifiedPersonContext = {
  profile: PersonMemoryProfile;
  /** Labelled prose block for conversational prompts, or null when empty. */
  forChat: string | null;
  forStructuredAi: PersonProfileForStructuredAi;
};

const MAX_ITEMS = 8;
const MAX_TEXT = 300;

function clip(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
}

export function buildUnifiedPersonContext(input: UnifiedPersonContextInput): UnifiedPersonContext {
  const profile = buildPersonMemoryProfile({
    personId: input.personId,
    personName: input.personName,
    relationLabel: input.relationLabel,
    birthday: input.birthday,
    knowledge: input.knowledge,
    symbol: input.symbol ?? null,
    pets: input.pets,
    happyConversations: input.happyConversations,
    locale: input.locale,
  });
  return {
    profile,
    forChat: formatPersonMemoryProfileForAssistant(profile),
    forStructuredAi: {
      name: clip(input.personName),
      userMeaning: profile.ourStory.userMeaning ? clip(profile.ourStory.userMeaning) : null,
      pets: profile.pets.slice(0, MAX_ITEMS).map((pet) => ({ name: clip(pet.name), species: clip(pet.species) })),
      notes: profile.notes.slice(0, MAX_ITEMS).map((entry) => clip(entry.text)),
      facts: profile.facts.slice(0, MAX_ITEMS).map((entry) => clip(entry.text)),
      recentUserStatements: profile.happyConversations
        .filter((entry) => entry.authority === "user")
        .slice(0, 4)
        .map((entry) => clip(entry.text)),
    },
  };
}
