import { supabase } from "@/lib/supabaseClient";
import { listKnowledge, getKnowledgeForPerson } from "@/lib/repositories/knowledgeRepository";
import { getOwnedPersonById, getPeople } from "@/lib/repositories/personRepository";
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

  const profile = await getKnowledgeForPerson({ personId });
  return buildPersonProfileViewModel({ person, knowledge: profile?.items ?? [], currentDate });
}

export type {
  PeoplePageViewModel,
  PersonListItemViewModel,
  PersonProfileViewModel,
  PersonHealthViewModel,
} from "./peopleData.types";
