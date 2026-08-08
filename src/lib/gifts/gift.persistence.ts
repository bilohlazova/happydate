import { supabase } from "@/lib/supabaseClient";
import type {
  CreateGiftInput,
  GiftLifecycle,
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
  created_at: string;
  updated_at: string;
}

const GIFT_COLUMNS =
  "id, person_id, event_id, title, lifecycle, occurred_on, created_at";
const LINK_COLUMNS =
  "id, person_id, event_id, gift_id, url, title, merchant, image_url, price_amount, currency, created_at, updated_at";

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
  const title = input.title.replace(/\s+/g, " ").trim();
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

export async function deleteSavedGiftLink(userId: string, linkId: string): Promise<void> {
  const { error } = await supabase.from("gift_links").delete()
    .eq("id", linkId).eq("user_id", userId);
  if (error) throw failure("deleteSavedGiftLink", error.message);
}
