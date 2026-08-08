import { supabase } from "../supabaseClient.ts";
import {
  createGift,
  deleteSavedGiftLink,
  loadAllGifts,
  loadGiftsForEvent,
  loadGiftsForPerson,
  listSavedGiftLinks,
  saveGiftLink,
  setGiftLifecycle,
} from "./gift.repository.ts";
import {
  buildGiftCollectionViewModel,
  buildGiftWorkspaceViewModel,
} from "./gift.mapper.ts";
import type {
  EventGiftsViewModel,
  GiftWorkspaceViewModel,
  GiftLifecycle,
  PersonGiftManagementViewModel,
  PersonGiftsViewModel,
  SaveGiftLinkInput,
} from "./gift.types.ts";

async function authenticatedUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error && !error.message.toLowerCase().includes("session missing")) {
    throw new Error(`[gift.loaders] Authentication failed: ${error.message}`);
  }
  return data.user?.id ?? null;
}

export async function loadPersonGifts(
  personId: string
): Promise<PersonGiftsViewModel> {
  const userId = await authenticatedUserId();
  const gifts = userId ? await loadGiftsForPerson(userId, personId) : [];
  return { personId, ...buildGiftCollectionViewModel(gifts) };
}

async function requiredUserId(): Promise<string> {
  const userId = await authenticatedUserId();
  if (!userId) throw new Error("[gift.loaders] Authentication required");
  return userId;
}

export async function loadPersonGiftManagement(
  personId: string,
): Promise<PersonGiftManagementViewModel> {
  const userId = await authenticatedUserId();
  if (!userId) {
    return { personId, ...buildGiftCollectionViewModel([]), savedLinks: [] };
  }
  const [gifts, savedLinks] = await Promise.all([
    loadGiftsForPerson(userId, personId),
    listSavedGiftLinks(userId, personId),
  ]);
  return { personId, ...buildGiftCollectionViewModel(gifts), savedLinks };
}

export async function createPersonGiftIdea(
  personId: string,
  title: string,
  eventId?: string | null,
): Promise<void> {
  await createGift(await requiredUserId(), {
    personId,
    eventId: eventId ?? null,
    title,
    lifecycle: "idea",
  });
}

export async function changePersonGiftLifecycle(
  giftId: string,
  lifecycle: GiftLifecycle,
): Promise<void> {
  await setGiftLifecycle(await requiredUserId(), giftId, lifecycle);
}

export async function savePersonGiftLink(
  input: Pick<SaveGiftLinkInput, "personId" | "url" | "title">,
): Promise<void> {
  await saveGiftLink(await requiredUserId(), input);
}

export async function removePersonGiftLink(linkId: string): Promise<void> {
  await deleteSavedGiftLink(await requiredUserId(), linkId);
}

export async function loadEventGifts(
  eventId: string
): Promise<EventGiftsViewModel> {
  const userId = await authenticatedUserId();
  const gifts = userId ? await loadGiftsForEvent(userId, eventId) : [];
  return { eventId, ...buildGiftCollectionViewModel(gifts) };
}

export async function loadGiftWorkspace(): Promise<GiftWorkspaceViewModel> {
  const userId = await authenticatedUserId();
  const gifts = userId ? await loadAllGifts(userId) : [];
  return buildGiftWorkspaceViewModel(gifts, Boolean(userId));
}
