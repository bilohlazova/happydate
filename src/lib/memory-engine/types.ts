/**
 * Memory Engine V2 is the product foundation: one person-centred relationship
 * story. Features (gifts, books, films, year reviews, conversation) may only
 * read relationship knowledge through this engine. They must not invent a
 * parallel interpretation of memories.
 *
 * Epistemic types keep authority explicit:
 * - fact: user-confirmed information Happy may treat as known
 * - memory: a user-saved experience; remember it, do not promote it to a trait
 * - interpretation: Happy inspiration or a relationship observation; never truth
 *
 * The user's own words always outrank any Happy text.
 */

export const MEMORY_EPISTEMIC_TYPES = ["fact", "memory", "interpretation"] as const;
export type MemoryEpistemicType = (typeof MEMORY_EPISTEMIC_TYPES)[number];

export const MEMORY_AUTHORITIES = ["user", "happy"] as const;
export type MemoryAuthority = (typeof MEMORY_AUTHORITIES)[number];

export const PROFILE_NOTE_SCHEMA = "person-profile-note-v1";
export const GENTLE_INSPIRATION_DISCLAIMER = "gentle-inspiration-v1";
export const OBSERVATION_DISCLAIMER = "observation-not-truth-v1";

export const PERSON_MEMORY_BLOCKS = [
  "who",
  "our_story",
  "chronology",
  "memories",
  "dates",
  "gifts",
  "pets",
  "symbol",
  "user_meaning",
  "notes",
  "happy_conversations",
] as const;
export type PersonMemoryBlockId = (typeof PERSON_MEMORY_BLOCKS)[number];

export interface PersonMemoryEntry {
  id: string;
  epistemicType: MemoryEpistemicType;
  authority: MemoryAuthority;
  text: string;
  occurredOn: string | null;
}

export interface SymbolMemoryLayers {
  kind: "preset" | "happy" | "drawing" | "upload";
  name: string | null;
  presetKey: string | null;
  hasImage: boolean;
  /** Highest-authority semantic layer: the user's own meaning. */
  userMeaning: string | null;
  /** Optional Happy inspiration; never a fact or diagnosis. */
  happyInterpretation: string | null;
  disclaimerVersion: string | null;
}

export interface RelationshipObservation {
  id: string;
  theme: string;
  summary: string;
  relatedEntryIds: string[];
  disclaimerVersion: typeof OBSERVATION_DISCLAIMER;
}

export interface PersonMemoryProfile {
  personId: string;
  personName: string;
  who: {
    relationLabel: string | null;
    birthday: string | null;
  };
  ourStory: {
    userMeaning: string | null;
    happyInterpretation: string | null;
  };
  chronology: Array<{ id: string; title: string; date: string }>;
  facts: PersonMemoryEntry[];
  memories: PersonMemoryEntry[];
  dates: Array<{ id: string; label: string; date: string }>;
  gifts: PersonMemoryEntry[];
  pets: Array<{ name: string; species: string; note: string | null }>;
  symbol: SymbolMemoryLayers | null;
  notes: PersonMemoryEntry[];
  observations: RelationshipObservation[];
  /** Bounded server-persisted turns: user messages are memory, Happy replies are interpretations. */
  happyConversations: PersonMemoryEntry[];
}
