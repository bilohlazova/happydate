import { supabase } from "../supabaseClient.ts";
import {
  clearGiftOutcome,
  createGift,
  deleteGift,
  deleteSavedGiftLink,
  loadAllGifts,
  loadGiftsForEvent,
  loadGiftsForPerson,
  listSavedGiftLinks,
  moveSavedGiftLink,
  saveGiftLink,
  setPreferredGiftLink,
  setGiftLifecycle,
  setGiftOutcome,
  setGiftOutcomeNote,
  setGiftOutcomeLearning,
  setGiftOutcomeFollowUp,
  updateGiftTitle,
} from "./gift.repository.ts";
import {
  buildGiftCollectionViewModel,
  buildGiftWorkspaceViewModel,
} from "./gift.mapper.ts";
import type {
  EventGiftsViewModel,
  GiftWorkspaceViewModel,
  GiftLifecycle,
  GiftOutcomeValue,
  PersonGiftManagementViewModel,
  PersonGiftsViewModel,
  SaveGiftLinkInput,
} from "./gift.types.ts";
import { normalizeGiftHttpsUrl } from "./giftLinkUrl.ts";
import { loadPersonProfile } from "../people/people.loaders.ts";
import { isPersistedCalendarEventId } from "./giftNavigation.ts";
import type { GiftRecipientContextViewModel } from "./gift.types.ts";

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

export async function loadGiftRecipientContext(
  personId: string,
  requestedEventId?: string | null,
): Promise<GiftRecipientContextViewModel> {
  const userId = await requiredUserId();
  const profile = await loadPersonProfile(personId);
  if (!profile.found || !profile.hero) {
    return { found: false, person: null, event: null, highlights: [] };
  }

  let event: GiftRecipientContextViewModel["event"] = null;
  if (isPersistedCalendarEventId(requestedEventId)) {
    const { data, error } = await supabase
      .from("events")
      .select("id,title,date,category")
      .eq("id", requestedEventId)
      .eq("user_id", userId)
      .eq("person_id", personId)
      .maybeSingle();
    if (error) throw new Error(`[gift.loaders] Event validation failed: ${error.message}`);
    if (data && typeof data.id === "string" && typeof data.title === "string" && typeof data.date === "string") {
      event = {
        id: data.id,
        title: data.title,
        date: data.date,
        category: typeof data.category === "string" ? data.category : null,
      };
    }
  }

  const highlights = [
    ...profile.likes.filter((item) => item.userConfirmed).map((item) => ({ kind: "like" as const, value: item.value })),
    ...profile.interests.filter((item) => item.userConfirmed).map((item) => ({ kind: "interest" as const, value: item.value })),
    ...profile.importantFacts.filter((item) => item.userConfirmed).map((item) => ({ kind: "fact" as const, value: item.value })),
  ].slice(0, 6);

  return {
    found: true,
    person: {
      id: profile.hero.id,
      name: profile.hero.name,
      relationLabel: profile.hero.relationLabel,
      birthday: profile.hero.birthday,
    },
    event,
    highlights,
  };
}

export async function changePersonGiftLifecycle(
  giftId: string,
  lifecycle: GiftLifecycle,
): Promise<void> {
  await setGiftLifecycle(await requiredUserId(), giftId, lifecycle);
}

export async function confirmPersonGiftOutcome(
  giftId: string,
  outcome: GiftOutcomeValue,
  note?: string | null,
): Promise<void> {
  await setGiftOutcome(await requiredUserId(), giftId, outcome, note);
}

export async function undoPersonGiftOutcome(giftId: string): Promise<void> {
  await clearGiftOutcome(await requiredUserId(), giftId);
}

export async function savePersonGiftOutcomeNote(
  giftId: string,
  outcome: GiftOutcomeValue,
  note: string,
): Promise<void> {
  await setGiftOutcomeNote(await requiredUserId(), giftId, outcome, note);
}

export async function changePersonGiftOutcomeLearning(
  giftId: string,
  enabled: boolean,
): Promise<void> {
  await setGiftOutcomeLearning(await requiredUserId(), giftId, enabled);
}

export async function changeGiftOutcomeFollowUp(
  giftId: string,
  action: "snooze" | "dismiss",
): Promise<void> {
  await setGiftOutcomeFollowUp(await requiredUserId(), giftId, action);
}

export async function renamePersonGiftIdea(giftId: string, title: string): Promise<void> {
  await updateGiftTitle(await requiredUserId(), giftId, title);
}

export async function removePersonGiftIdea(giftId: string): Promise<void> {
  await deleteGift(await requiredUserId(), giftId);
}

export async function savePersonGiftLink(
  input: Pick<SaveGiftLinkInput, "personId" | "giftId" | "url" | "title">,
): Promise<void> {
  await saveGiftLink(await requiredUserId(), input);
}

export async function savePersonGiftLinkOnce(
  input: Pick<SaveGiftLinkInput, "personId" | "giftId" | "url" | "title">,
): Promise<{ status: "created" | "already_saved"; linkId: string }> {
  const userId = await requiredUserId();
  const normalizedUrl = normalizeGiftHttpsUrl(input.url);
  if (!normalizedUrl) throw new Error("[gift.loaders] A valid HTTPS URL is required");
  const existing = await listSavedGiftLinks(userId, input.personId);
  const duplicate = existing.find((link) => normalizeGiftHttpsUrl(link.url) === normalizedUrl);
  if (duplicate) return { status: "already_saved", linkId: duplicate.id };
  const created = await saveGiftLink(userId, { ...input, url: normalizedUrl });
  return { status: "created", linkId: created.id };
}

export async function removePersonGiftLink(linkId: string): Promise<void> {
  await deleteSavedGiftLink(await requiredUserId(), linkId);
}

export async function movePersonGiftLink(
  linkId: string,
  giftId: string | null,
): Promise<void> {
  await moveSavedGiftLink(await requiredUserId(), linkId, giftId);
}

export async function choosePersonGiftLink(
  linkId: string,
  preferred: boolean,
  decisionNote?: string | null,
): Promise<void> {
  await setPreferredGiftLink(
    await requiredUserId(),
    linkId,
    preferred,
    decisionNote,
  );
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
