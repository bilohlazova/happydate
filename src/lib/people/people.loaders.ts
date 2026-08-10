import { supabase } from "@/lib/supabaseClient";
import { archiveOwnedPersonKnowledge, deleteArchivedOwnedPersonKnowledge, getKnowledgeForPerson, listKnowledge, restoreOwnedPersonKnowledge, updateOwnedPersonKnowledgeValue } from "@/lib/repositories/knowledgeRepository";
import { getOwnedPersonById, getPeople } from "@/lib/repositories/personRepository";
import { loadCanonicalGiftsForPerson } from "@/lib/gifts/gift.repository";
import { loadGiftOutcomeLearningEnabled } from "@/lib/repositories/profile/giftOutcomeLearning.repository";
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

  const [profile, gifts, giftOutcomeLearningEnabled] = await Promise.all([
    getKnowledgeForPerson({ personId, includeArchived: true }),
    loadCanonicalGiftsForPerson(userId, personId),
    loadGiftOutcomeLearningEnabled(userId),
  ]);
  return buildPersonProfileViewModel({ person, knowledge: profile?.items ?? [], gifts, giftOutcomeLearningEnabled, currentDate });
}

export async function changePersonKnowledgeValue(personId: string, knowledgeId: string, value: string): Promise<void> {
  const userId = await authenticatedUserId();
  if (!userId) throw new Error("Authentication required");
  await updateOwnedPersonKnowledgeValue({ userId, personId, knowledgeId, value });
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

export type {
  PeoplePageViewModel,
  PersonListItemViewModel,
  PersonProfileViewModel,
  PersonHealthViewModel,
} from "./peopleData.types";
