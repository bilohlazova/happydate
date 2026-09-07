import type { KnowledgeItem } from "../knowledge/index.ts";
import { consumerValue } from "../knowledge/index.ts";
import type { PersonSymbolRow } from "../repositories/personSymbolRepository.ts";
import { knowledgeEpistemicType, isProfileNote } from "./epistemicType.ts";
import { noticeRelationshipConnections } from "./relationshipIntelligence.ts";
import type { PersonMemoryEntry, PersonMemoryProfile, SymbolMemoryLayers } from "./types.ts";

function textOf(item: KnowledgeItem): string | null {
  const value = (consumerValue(item) ?? item.title ?? item.summary)?.replace(/\s+/g, " ").trim();
  return value || null;
}

function toEntry(item: KnowledgeItem): PersonMemoryEntry | null {
  const text = textOf(item);
  if (!text || item.state !== "active" || item.kind === "journal") return null;
  return {
    id: item.id,
    epistemicType: knowledgeEpistemicType(item),
    authority: "user",
    text,
    occurredOn: item.occurredOn,
  };
}

export function symbolMemoryLayers(symbol: PersonSymbolRow | null): SymbolMemoryLayers | null {
  if (!symbol) return null;
  return {
    kind: symbol.kind,
    name: symbol.name,
    presetKey: symbol.preset_key,
    hasImage: Boolean(symbol.image_path || symbol.image_url),
    userMeaning: symbol.user_meaning?.trim() || null,
    happyInterpretation: symbol.happy_interpretation?.trim() || symbol.description?.trim() || null,
    disclaimerVersion: symbol.interpretation_disclaimer_version,
  };
}

export function buildPersonMemoryProfile(input: {
  personId: string;
  personName: string;
  relationLabel?: string | null;
  birthday?: string | null;
  knowledge: readonly KnowledgeItem[];
  symbol?: PersonSymbolRow | null;
  pets?: Array<{ name: string; species: string; note: string | null }>;
  chronology?: Array<{ id: string; title: string; date: string }>;
  happyConversations?: Array<{ id: string; userMessage: string; happyResponse: string; createdAt: string }>;
  locale?: "uk" | "en";
}): PersonMemoryProfile {
  const visible = input.knowledge.filter((item) => item.personId === input.personId && item.state === "active" && item.kind !== "journal");
  const memories = visible.filter((item) => item.kind === "experience" && !isProfileNote(item)).flatMap((item) => toEntry(item) ?? []);
  const facts = visible.filter((item) => knowledgeEpistemicType(item) === "fact").flatMap((item) => toEntry(item) ?? []);
  const notes = visible.filter(isProfileNote).flatMap((item) => toEntry(item) ?? []);
  const gifts = visible.filter((item) => item.kind === "gift").flatMap((item) => toEntry(item) ?? []);
  const symbol = symbolMemoryLayers(input.symbol ?? null);
  return {
    personId: input.personId,
    personName: input.personName,
    who: {
      relationLabel: input.relationLabel?.trim() || null,
      birthday: input.birthday ?? null,
    },
    ourStory: {
      userMeaning: symbol?.userMeaning ?? null,
      happyInterpretation: symbol?.happyInterpretation ?? null,
    },
    chronology: input.chronology ?? [],
    facts,
    memories,
    dates: input.birthday ? [{ id: `birthday:${input.personId}`, label: "birthday", date: input.birthday }] : [],
    gifts,
    pets: input.pets ?? [],
    symbol,
    notes,
    observations: noticeRelationshipConnections(memories, input.locale === "uk" ? "uk" : "en"),
    happyConversations: (input.happyConversations ?? []).flatMap((turn) => ([
      { id: `${turn.id}:user`, epistemicType: "memory" as const, authority: "user" as const, text: turn.userMessage, occurredOn: turn.createdAt },
      { id: `${turn.id}:happy`, epistemicType: "interpretation" as const, authority: "happy" as const, text: turn.happyResponse, occurredOn: turn.createdAt },
    ])),
  };
}

/** Future AI features (gifts, book, film, year review) must use this selector. */
export function selectAuthoritativeContextForAi(profile: PersonMemoryProfile): {
  factsAndMemories: PersonMemoryEntry[];
  userMeaning: string | null;
  interpretations: string[];
} {
  return {
    factsAndMemories: [...profile.facts, ...profile.memories, ...profile.notes, ...profile.gifts],
    userMeaning: profile.ourStory.userMeaning,
    interpretations: [
      profile.ourStory.happyInterpretation,
      ...profile.observations.map((item) => item.summary),
    ].filter((value): value is string => Boolean(value)),
  };
}
