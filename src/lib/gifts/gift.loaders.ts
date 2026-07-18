import { supabase } from "../supabaseClient.ts";
import {
  loadAllGifts,
  loadGiftsForEvent,
  loadGiftsForPerson,
} from "./gift.repository.ts";
import {
  buildGiftCollectionViewModel,
  buildGiftWorkspaceViewModel,
} from "./gift.mapper.ts";
import type {
  EventGiftsViewModel,
  GiftWorkspaceViewModel,
  PersonGiftsViewModel,
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
