import { supabase } from "../supabaseClient.ts";
import {
  loadAllGifts,
  loadGiftsForEvent,
  loadGiftsForPerson,
} from "./gift.repository.ts";
import { buildGiftCollectionViewModel } from "./gift.mapper.ts";
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
  const collection = buildGiftCollectionViewModel(gifts);
  return {
    isAuthenticated: Boolean(userId),
    ...collection,
    personIds: uniqueIds(gifts.map((gift) => gift.personId)),
    eventIds: uniqueIds(gifts.map((gift) => gift.eventId)),
  };
}

function uniqueIds(ids: Array<string | null>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))].sort();
}

