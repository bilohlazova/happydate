import { supabase } from "@/lib/supabaseClient";
import { archiveOwnedPersonKnowledge, createKnowledge, deleteArchivedOwnedPersonKnowledge, getKnowledgeForPerson, listKnowledge, listKnowledgeChangeHistoryForOwnedPerson, resolveOwnedPersonKnowledgeConflict, restoreOwnedPersonKnowledge, reviewOwnedPersonKnowledge, updateOwnedPersonKnowledgeValue } from "@/lib/repositories/knowledgeRepository";
import { getOwnedPersonById, getPeople } from "@/lib/repositories/personRepository";
import { loadCanonicalGiftsForPerson } from "@/lib/gifts/gift.repository";
import { loadGiftOutcomeLearningEnabled } from "@/lib/repositories/profile/giftOutcomeLearning.repository";
import { createPetForPerson, getPetsForPerson, unlinkPetFromPerson, updatePet } from "@/lib/repositories/petRepository";
import {
  deletePersonSymbol,
  getPersonSymbol,
  savePersonSymbol,
  updatePersonSymbolInterpretation,
  updatePersonSymbolMeaning,
  type PersonSymbolKind,
} from "@/lib/repositories/personSymbolRepository";
import { PROFILE_NOTE_SCHEMA } from "@/lib/memory-engine";
import { getPersonHappyConversations } from "@/lib/repositories/personHappyConversationRepository";
import { buildPeoplePageViewModel, buildPersonProfileViewModel } from "./buildPeopleViewModels";
import type { PeoplePageViewModel, PersonProfileViewModel } from "./peopleData.types";

async function authenticatedUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error && !error.message.toLowerCase().includes("session missing")) {
    throw new Error(`[people.loaders] Authentication failed: ${error.message}`);
  }
  return data.user?.id ?? null;
}

export async function loadPeoplePage(currentDate = new Date()): Promise<PeoplePageViewModel> {
  const userId = await authenticatedUserId();
  if (!userId) return buildPeoplePageViewModel({ people: [], knowledge: [], currentDate, isAuthenticated: false });

  const [people, knowledge] = await Promise.all([
    getPeople(userId),
    listKnowledge({ userId }),
  ]);
  return buildPeoplePageViewModel({ people, knowledge, currentDate });
}

export async function loadPersonProfile(
  personId: string,
  currentDate = new Date(),
): Promise<PersonProfileViewModel> {
  const userId = await authenticatedUserId();
  if (!userId) return buildPersonProfileViewModel({ person: null, knowledge: [], currentDate, isAuthenticated: false });

  // Ownership is verified before the person-scoped Knowledge read.
  const person = await getOwnedPersonById(userId, personId);
  if (!person) return buildPersonProfileViewModel({ person: null, knowledge: [], currentDate });

  const [profile, knowledgeChanges, gifts, giftOutcomeLearningEnabled, pets, symbol, happyConversations] = await Promise.all([
    getKnowledgeForPerson({ personId, includeArchived: true }),
    listKnowledgeChangeHistoryForOwnedPerson({ userId, personId }),
    loadCanonicalGiftsForPerson(userId, personId),
    loadGiftOutcomeLearningEnabled(userId),
    getPetsForPerson(userId, personId),
    getPersonSymbol(userId, personId),
    getPersonHappyConversations(userId, personId),
  ]);
  return buildPersonProfileViewModel({ person, knowledge: profile?.items ?? [], knowledgeChanges, gifts, pets, symbol, happyConversations, giftOutcomeLearningEnabled, currentDate });
}

export async function addPersonPet(input: { personId: string; name: string; species: string; breed?: string; birthDate?: string; note?: string }): Promise<void> {
  const userId = await authenticatedUserId();
  if (!userId) throw new Error("Authentication required");
  await createPetForPerson({ userId, ...input });
}

export async function editPersonPet(input: { petId: string; name: string; species: string; breed?: string; birthDate?: string; note?: string }): Promise<void> {
  const userId = await authenticatedUserId();
  if (!userId) throw new Error("Authentication required");
  await updatePet({ userId, ...input });
}

export async function removePersonPet(personId: string, petId: string): Promise<void> {
  const userId = await authenticatedUserId();
  if (!userId) throw new Error("Authentication required");
  await unlinkPetFromPerson(userId, personId, petId);
}

export async function changePersonKnowledgeValue(personId: string, knowledgeId: string, value: string): Promise<void> {
  const userId = await authenticatedUserId();
  if (!userId) throw new Error("Authentication required");
  await updateOwnedPersonKnowledgeValue({ userId, personId, knowledgeId, value });
}

export async function addPersonKnowledge(
  personId: string,
  kind: "like" | "dislike" | "interest" | "important_fact",
  value: string,
): Promise<void> {
  const userId = await authenticatedUserId();
  if (!userId) throw new Error("Authentication required");
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > 500) throw new Error("Invalid knowledge value");

  const legacyType = kind === "interest" ? "interest" : kind === "important_fact" ? "personal_fact" : "preference";
  await createKnowledge({
    userId,
    personId,
    legacyType,
    title: normalized,
    value: normalized,
    source: "manual",
    sourceRecordId: `profile-local-${crypto.randomUUID()}`,
    sourceExcerpt: normalized,
    userConfirmedAt: new Date().toISOString(),
    captureSchemaVersion: "person-profile-local-v1",
    aiTags: kind === "like" ? ["like"] : kind === "dislike" ? ["dislike"] : [],
  });
}

export async function addPersonNote(personId: string, value: string): Promise<void> {
  const userId = await authenticatedUserId();
  if (!userId) throw new Error("Authentication required");
  const normalized = value.trim();
  if (!normalized || normalized.length > 5000) throw new Error("Invalid note");
  await createKnowledge({
    userId,
    personId,
    legacyType: "note",
    title: normalized.slice(0, 160),
    value: normalized,
    content: normalized,
    occurredOn: new Date().toISOString().slice(0, 10),
    source: "manual",
    sourceRecordId: `profile-note-${crypto.randomUUID()}`,
    sourceExcerpt: normalized,
    userConfirmedAt: new Date().toISOString(),
    captureSchemaVersion: PROFILE_NOTE_SCHEMA,
    aiTags: ["profile_note"],
  });
}

export async function deletePersonNote(personId: string, knowledgeId: string): Promise<void> {
  const userId = await authenticatedUserId();
  if (!userId) throw new Error("Authentication required");
  await archiveOwnedPersonKnowledge({ userId, personId, knowledgeId });
}

export async function saveOwnedPersonSymbol(input: {
  personId: string;
  kind: PersonSymbolKind;
  name?: string;
  presetKey?: string;
  image?: Blob;
  prompt?: string;
}): Promise<void> {
  const userId = await authenticatedUserId();
  if (!userId) throw new Error("Authentication required");
  await savePersonSymbol({ userId, ...input });
}

export async function removeOwnedPersonSymbol(personId: string): Promise<void> {
  const userId = await authenticatedUserId();
  if (!userId) throw new Error("Authentication required");
  await deletePersonSymbol(userId, personId);
}

export async function saveOwnedPersonSymbolMeaning(personId: string, meaning: string): Promise<void> {
  const userId = await authenticatedUserId();
  if (!userId) throw new Error("Authentication required");
  await updatePersonSymbolMeaning(userId, personId, meaning);
}

export async function saveOwnedPersonSymbolInterpretation(personId: string, interpretation: string | null): Promise<void> {
  const userId = await authenticatedUserId();
  if (!userId) throw new Error("Authentication required");
  await updatePersonSymbolInterpretation(userId, personId, interpretation);
}

export async function archivePersonKnowledge(personId: string, knowledgeId: string): Promise<void> {
  const userId = await authenticatedUserId();
  if (!userId) throw new Error("Authentication required");
  await archiveOwnedPersonKnowledge({ userId, personId, knowledgeId });
}

export async function restorePersonKnowledge(personId: string, knowledgeId: string): Promise<void> {
  const userId = await authenticatedUserId();
  if (!userId) throw new Error("Authentication required");
  await restoreOwnedPersonKnowledge({ userId, personId, knowledgeId });
}

export async function permanentlyDeleteArchivedPersonKnowledge(personId: string, knowledgeId: string): Promise<void> {
  const userId = await authenticatedUserId();
  if (!userId) throw new Error("Authentication required");
  await deleteArchivedOwnedPersonKnowledge({ userId, personId, knowledgeId });
}

export async function resolvePersonKnowledgeConflict(personId: string, winnerId: string, loserIds: string[]): Promise<void> {
  const userId = await authenticatedUserId();
  if (!userId) throw new Error("Authentication required");
  await resolveOwnedPersonKnowledgeConflict({ userId, personId, winnerId, loserIds });
}

export async function reviewPersonKnowledge(personId: string, knowledgeId: string, action: "confirm" | "snooze"): Promise<void> {
  const userId = await authenticatedUserId();
  if (!userId) throw new Error("Authentication required");
  await reviewOwnedPersonKnowledge({ userId, personId, knowledgeId, action });
}

export type {
  PeoplePageViewModel,
  PersonListItemViewModel,
  PersonProfileViewModel,
  PersonHealthViewModel,
} from "./peopleData.types";
