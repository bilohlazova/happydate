import { supabase } from "@/lib/supabaseClient";
import type {
  CreateGiftInput,
  GiftLifecycle,
  GiftOutcomeValue,
  GiftRecord,
  SaveGiftLinkInput,
  SavedGiftLink,
} from "./gift.types.ts";

interface GiftRow {
  id: string;
  person_id: string;
  event_id: string | null;
  title: string;
  lifecycle: GiftLifecycle;
  occurred_on: string | null;
  created_at: string;
  final_source_link_id: string | null;
  final_link_url: string | null;
  final_link_title: string | null;
  final_price_amount: number | null;
  final_currency: string | null;
  final_decision_note: string | null;
  selection_finalized_at: string | null;
  recipient_reaction: GiftOutcomeValue | null;
  recipient_reaction_note: string | null;
  recipient_reaction_confirmed_at: string | null;
  recipient_reaction_learning_enabled: boolean;
}

interface GiftLinkRow {
  id: string;
  person_id: string;
  event_id: string | null;
  gift_id: string | null;
  url: string;
  title: string | null;
  merchant: string | null;
  image_url: string | null;
  price_amount: number | null;
  currency: string | null;
  is_preferred: boolean;
  decision_note: string | null;
  created_at: string;
  updated_at: string;
}

const GIFT_COLUMNS =
  "id, person_id, event_id, title, lifecycle, occurred_on, created_at, final_source_link_id, final_link_url, final_link_title, final_price_amount, final_currency, final_decision_note, selection_finalized_at, recipient_reaction, recipient_reaction_note, recipient_reaction_confirmed_at, recipient_reaction_learning_enabled";
const LINK_COLUMNS =
  "id, person_id, event_id, gift_id, url, title, merchant, image_url, price_amount, currency, is_preferred, decision_note, created_at, updated_at";

function failure(operation: string, message: string): Error {
  return new Error(`[giftPersistence] ${operation} failed: ${message}`);
}

function mapGift(row: GiftRow): GiftRecord {
  return {
    id: row.id,
    lifecycle: row.lifecycle,
    personId: row.person_id,
    eventId: row.event_id,
    title: row.title,
    value: row.title,
    occurredOn: row.occurred_on,
    createdAt: row.created_at,
    sourceKnowledgeId: null,
    finalSelection: row.selection_finalized_at ? {
      sourceLinkId: row.final_source_link_id,
      url: row.final_link_url,
      title: row.final_link_title,
      priceAmount: row.final_price_amount,
      currency: row.final_currency,
      decisionNote: row.final_decision_note,
      finalizedAt: row.selection_finalized_at,
    } : null,
    finalOutcome: row.recipient_reaction && row.recipient_reaction_confirmed_at ? {
      value: row.recipient_reaction,
      note: row.recipient_reaction_note,
      confirmedAt: row.recipient_reaction_confirmed_at,
      learningEnabled: row.recipient_reaction_learning_enabled !== false,
    } : null,
  };
}

function mapLink(row: GiftLinkRow): SavedGiftLink {
  return {
    id: row.id,
    personId: row.person_id,
    eventId: row.event_id,
    giftId: row.gift_id,
    url: row.url,
    title: row.title,
    merchant: row.merchant,
    imageUrl: row.image_url,
    priceAmount: row.price_amount,
    currency: row.currency,
    isPreferred: row.is_preferred,
    decisionNote: row.decision_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizedHttpsUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw failure("saveGiftLink", "A valid HTTPS URL is required");
  }
  if (parsed.protocol !== "https:") {
    throw failure("saveGiftLink", "Only HTTPS URLs can be saved");
  }
  return parsed.toString();
}

function normalizedGiftTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

async function findEquivalentActiveGift(
  userId: string,
  input: CreateGiftInput,
  normalizedTitle: string,
): Promise<GiftRecord | null> {
  let query = supabase
    .from("gifts")
    .select(GIFT_COLUMNS)
    .eq("user_id", userId)
    .eq("person_id", input.personId)
    .eq("normalized_title", normalizedTitle.toLocaleLowerCase("und"))
    .neq("lifecycle", "given");
  query = input.eventId
    ? query.eq("event_id", input.eventId)
    : query.is("event_id", null);
  const { data, error } = await query
    .order("created_at", { ascending: true })
    .limit(1)
    .returns<GiftRow[]>()
    .maybeSingle();
  if (error) throw failure("findEquivalentActiveGift", error.message);
  return data ? mapGift(data) : null;
}

export async function listCanonicalGifts(userId: string): Promise<GiftRecord[]> {
  const { data, error } = await supabase
    .from("gifts")
    .select(GIFT_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<GiftRow[]>();
  if (error) throw failure("listCanonicalGifts", error.message);
  return (data ?? []).map(mapGift);
}

export async function createCanonicalGift(
  userId: string,
  input: CreateGiftInput,
): Promise<GiftRecord> {
  const title = normalizedGiftTitle(input.title);
  if (!title) throw failure("createCanonicalGift", "A title is required");
  const lifecycle = input.lifecycle ?? "idea";
  const occurredOn = lifecycle === "given"
    ? input.occurredOn ?? new Date().toISOString().slice(0, 10)
    : input.occurredOn ?? null;
  const { data, error } = await supabase.from("gifts").insert({
    user_id: userId,
    person_id: input.personId,
    event_id: input.eventId ?? null,
    title,
    lifecycle,
    occurred_on: occurredOn,
  }).select(GIFT_COLUMNS).returns<GiftRow[]>().single();
  if (error?.code === "23505" && lifecycle !== "given") {
    const existing = await findEquivalentActiveGift(userId, input, title);
    if (existing) return existing;
  }
  if (error) throw failure("createCanonicalGift", error.message);
  return mapGift(data);
}

export async function setCanonicalGiftLifecycle(
  userId: string,
  giftId: string,
  lifecycle: GiftLifecycle,
  occurredOn?: string | null,
): Promise<GiftRecord> {
  const confirmedDate = lifecycle === "given"
    ? occurredOn ?? new Date().toISOString().slice(0, 10)
    : occurredOn ?? null;
  const { data, error } = await supabase.from("gifts").update({
    lifecycle,
    occurred_on: confirmedDate,
  }).eq("id", giftId).eq("user_id", userId)
    .select(GIFT_COLUMNS).returns<GiftRow[]>().single();
  if (error) throw failure("setCanonicalGiftLifecycle", error.message);
  return mapGift(data);
}

export async function setCanonicalGiftOutcome(
  userId: string,
  giftId: string,
  outcome: GiftOutcomeValue,
  note?: string | null,
): Promise<GiftRecord> {
  const normalizedNote = note?.replace(/\s+/g, " ").trim() || null;
  const { data, error } = await supabase.from("gifts").update({
    recipient_reaction: outcome,
    recipient_reaction_note: normalizedNote,
  }).eq("id", giftId).eq("user_id", userId).eq("lifecycle", "given")
    .select(GIFT_COLUMNS).returns<GiftRow[]>().single();
  if (error) throw failure("setCanonicalGiftOutcome", error.message);
  return mapGift(data);
}

export async function clearCanonicalGiftOutcome(
  userId: string,
  giftId: string,
): Promise<GiftRecord> {
  const { data, error } = await supabase.from("gifts").update({
    recipient_reaction: null,
    recipient_reaction_note: null,
  }).eq("id", giftId).eq("user_id", userId).eq("lifecycle", "given")
    .not("recipient_reaction", "is", null)
    .select(GIFT_COLUMNS).returns<GiftRow[]>().single();
  if (error) throw failure("clearCanonicalGiftOutcome", error.message);
  return mapGift(data);
}

export async function setCanonicalGiftOutcomeNote(
  userId: string,
  giftId: string,
  outcome: GiftOutcomeValue,
  note: string,
): Promise<GiftRecord> {
  const normalizedNote = note.replace(/\s+/g, " ").trim();
  if (!normalizedNote || normalizedNote.length > 500) {
    throw failure("setCanonicalGiftOutcomeNote", "A note between 1 and 500 characters is required");
  }
  const { data, error } = await supabase.from("gifts").update({
    recipient_reaction_note: normalizedNote,
  }).eq("id", giftId).eq("user_id", userId).eq("lifecycle", "given")
    .eq("recipient_reaction", outcome)
    .select(GIFT_COLUMNS).returns<GiftRow[]>().single();
  if (error) throw failure("setCanonicalGiftOutcomeNote", error.message);
  return mapGift(data);
}

export async function setCanonicalGiftOutcomeLearning(
  userId: string,
  giftId: string,
  enabled: boolean,
): Promise<GiftRecord> {
  const { data, error } = await supabase.from("gifts").update({
    recipient_reaction_learning_enabled: enabled,
  }).eq("id", giftId).eq("user_id", userId).eq("lifecycle", "given")
    .not("recipient_reaction", "is", null)
    .select(GIFT_COLUMNS).returns<GiftRow[]>().single();
  if (error) throw failure("setCanonicalGiftOutcomeLearning", error.message);
  return mapGift(data);
}

export async function setCanonicalGiftOutcomeFollowUp(
  userId: string,
  giftId: string,
  action: "snooze" | "dismiss",
): Promise<void> {
  const update = action === "snooze"
    ? {
      recipient_reaction_follow_up_snoozed_until: new Date(Date.now() + 3 * 24 * 60 * 60 * 1_000).toISOString(),
      recipient_reaction_follow_up_dismissed_at: null,
    }
    : {
      recipient_reaction_follow_up_snoozed_until: null,
      recipient_reaction_follow_up_dismissed_at: new Date().toISOString(),
    };
  const { data, error } = await supabase.from("gifts").update(update)
    .eq("id", giftId)
    .eq("user_id", userId)
    .eq("lifecycle", "given")
    .is("recipient_reaction", null)
    .select("id")
    .returns<Array<{ id: string }>>()
    .maybeSingle();
  if (error) throw failure("setCanonicalGiftOutcomeFollowUp", error.message);
  if (!data) throw failure("setCanonicalGiftOutcomeFollowUp", "Pending Gift question was not found");
}

export async function updateCanonicalGiftTitle(
  userId: string,
  giftId: string,
  value: string,
): Promise<GiftRecord> {
  const title = normalizedGiftTitle(value);
  if (!title) throw failure("updateCanonicalGiftTitle", "A title is required");
  const { data, error } = await supabase.from("gifts").update({ title })
    .eq("id", giftId).eq("user_id", userId).neq("lifecycle", "given")
    .select(GIFT_COLUMNS).returns<GiftRow[]>().single();
  if (error) throw failure("updateCanonicalGiftTitle", error.message);
  return mapGift(data);
}

export async function deleteCanonicalGift(
  userId: string,
  giftId: string,
): Promise<void> {
  const { data, error } = await supabase.from("gifts").delete()
    .eq("id", giftId).eq("user_id", userId).neq("lifecycle", "given")
    .select("id").returns<Array<{ id: string }>>().maybeSingle();
  if (error) throw failure("deleteCanonicalGift", error.message);
  if (!data) throw failure("deleteCanonicalGift", "Active gift was not found");
}

export async function listSavedGiftLinks(
  userId: string,
  personId?: string,
): Promise<SavedGiftLink[]> {
  let query = supabase.from("gift_links").select(LINK_COLUMNS).eq("user_id", userId);
  if (personId) query = query.eq("person_id", personId);
  const { data, error } = await query.order("created_at", { ascending: false })
    .returns<GiftLinkRow[]>();
  if (error) throw failure("listSavedGiftLinks", error.message);
  return (data ?? []).map(mapLink);
}

export async function saveGiftLink(
  userId: string,
  input: SaveGiftLinkInput,
): Promise<SavedGiftLink> {
  // Merchant metadata is untrusted user data; only the URL protocol is enforced here.
  const { data, error } = await supabase.from("gift_links").insert({
    user_id: userId,
    person_id: input.personId,
    event_id: input.eventId ?? null,
    gift_id: input.giftId ?? null,
    url: normalizedHttpsUrl(input.url),
    title: input.title?.trim() || null,
    merchant: input.merchant?.trim() || null,
    image_url: input.imageUrl ? normalizedHttpsUrl(input.imageUrl) : null,
    price_amount: input.priceAmount ?? null,
    currency: input.currency?.trim().toUpperCase() || null,
  }).select(LINK_COLUMNS).returns<GiftLinkRow[]>().single();
  if (error) throw failure("saveGiftLink", error.message);
  return mapLink(data);
}

export async function moveSavedGiftLink(
  userId: string,
  linkId: string,
  giftId: string | null,
): Promise<SavedGiftLink> {
  const { data, error } = await supabase.from("gift_links")
    .update({ gift_id: giftId })
    .eq("id", linkId).eq("user_id", userId)
    .select(LINK_COLUMNS).returns<GiftLinkRow[]>().single();
  if (error) throw failure("moveSavedGiftLink", error.message);
  return mapLink(data);
}

export async function setPreferredGiftLink(
  userId: string,
  linkId: string,
  preferred: boolean,
  decisionNote?: string | null,
): Promise<SavedGiftLink> {
  const note = preferred ? decisionNote?.replace(/\s+/g, " ").trim() || null : null;
  const update = () => supabase.from("gift_links")
    .update({ is_preferred: preferred, decision_note: note })
    .eq("id", linkId).eq("user_id", userId)
    .select(LINK_COLUMNS).returns<GiftLinkRow[]>().single();
  let result = await update();
  if (result.error?.code === "23505") result = await update();
  if (result.error) throw failure("setPreferredGiftLink", result.error.message);
  return mapLink(result.data);
}

export async function deleteSavedGiftLink(userId: string, linkId: string): Promise<void> {
  const { error } = await supabase.from("gift_links").delete()
    .eq("id", linkId).eq("user_id", userId);
  if (error) throw failure("deleteSavedGiftLink", error.message);
}
