import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import {
  buildKnowledgeSnapshot,
  buildPersonKnowledgeProfile,
  getPersonKnowledge,
  mapLegacyMemoriesToKnowledge,
  mapLegacyMemoryToKnowledge,
  selectKnowledgeContext,
  type KnowledgeContextOptions,
  type KnowledgeItem,
  type PersonKnowledgeProfile,
} from "@/lib/knowledge";
import { MEMORY_ROW_COLUMNS, type MemoryRow } from "./memory.types";
import { assertPersistableMemoryImageValues } from "@/lib/storage/memoryImages";

export interface ListKnowledgeInput {
  userId: string;
  includeArchived?: boolean;
}

export interface GetKnowledgeForPersonInput {
  personId: string;
  includeArchived?: boolean;
}

export interface GetKnowledgeContextInput
  extends ListKnowledgeInput,
    KnowledgeContextOptions {}

/**
 * Canonical writes currently target the legacy persistence schema. Fields that
 * cannot be represented losslessly (classification, polarity, state history)
 * are intentionally not accepted before a future additive migration.
 */
export interface CreateKnowledgeInput {
  userId: string;
  personId?: string | null;
  eventId?: string | null;
  legacyType: string;
  title?: string | null;
  value?: string | null;
  content?: string | null;
  occurredOn?: string | null;
  importance?: number;
  source?: string;
  images?: string[];
}

export interface UpdateKnowledgeInput {
  personId?: string | null;
  eventId?: string | null;
  legacyType?: string;
  title?: string | null;
  value?: string | null;
  content?: string | null;
  occurredOn?: string | null;
  importance?: number;
  source?: string;
  images?: string[];
}

function repositoryError(operation: string, message: string): Error {
  return new Error(`[knowledgeRepository] ${operation} failed: ${message}`);
}

function serverSupabaseClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function createKnowledgeWithClient(
  client: SupabaseClient,
  input: CreateKnowledgeInput,
): Promise<KnowledgeItem> {
  const images = assertPersistableMemoryImageValues(input.images ?? []);
  const { data, error } = await client
    .from("memories")
    .insert({
      user_id: input.userId,
      person_id: input.personId ?? null,
      event_id: input.eventId ?? null,
      type: input.legacyType,
      title: input.title ?? null,
      value_text: input.value ?? null,
      content_text: input.content ?? null,
      occurred_on: input.occurredOn ?? null,
      importance: input.importance ?? 0,
      source: input.source ?? "manual",
      images,
      is_active: true,
    })
    .select(MEMORY_ROW_COLUMNS)
    .returns<MemoryRow[]>()
    .single();

  if (error) throw repositoryError("createKnowledge", error.message);
  return mapLegacyMemoryToKnowledge(data);
}

/** @internal Raw compatibility read used by legacy repository methods. */
export async function listKnowledgeRows({
  userId,
  includeArchived = false,
}: ListKnowledgeInput): Promise<MemoryRow[]> {
  let query = supabase
    .from("memories")
    .select(MEMORY_ROW_COLUMNS)
    .eq("user_id", userId);

  if (!includeArchived) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .returns<MemoryRow[]>();

  if (error) throw repositoryError("listKnowledgeRows", error.message);
  return data ?? [];
}

/** @internal Raw compatibility read used by legacy repository methods. */
export async function listKnowledgeRowsForPerson({
  personId,
  includeArchived = false,
}: GetKnowledgeForPersonInput): Promise<MemoryRow[]> {
  let query = supabase
    .from("memories")
    .select(MEMORY_ROW_COLUMNS)
    .eq("person_id", personId);

  if (!includeArchived) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .returns<MemoryRow[]>();

  if (error) {
    throw repositoryError("listKnowledgeRowsForPerson", error.message);
  }
  return data ?? [];
}

export async function listKnowledge(
  input: ListKnowledgeInput
): Promise<KnowledgeItem[]> {
  const rows = await listKnowledgeRows(input);
  return mapLegacyMemoriesToKnowledge(rows);
}

export async function getKnowledgeForPerson(
  input: GetKnowledgeForPersonInput
): Promise<PersonKnowledgeProfile | null> {
  const items = mapLegacyMemoriesToKnowledge(
    await listKnowledgeRowsForPerson(input)
  );
  return (
    getPersonKnowledge(buildKnowledgeSnapshot(items), input.personId) ??
    buildPersonKnowledgeProfile(input.personId, [])
  );
}

export async function getKnowledgeContext(
  input: GetKnowledgeContextInput
): Promise<KnowledgeItem[]> {
  const items = await listKnowledge(input);
  return selectKnowledgeContext(items, {
    personIds: input.personIds,
    limit: input.limit,
  });
}

export async function createKnowledge(
  input: CreateKnowledgeInput
): Promise<KnowledgeItem> {
  return createKnowledgeWithClient(supabase, input);
}

export async function createKnowledgeOnServer(
  input: CreateKnowledgeInput
): Promise<KnowledgeItem> {
  return createKnowledgeWithClient(serverSupabaseClient(), input);
}

export async function updateKnowledge(
  memoryId: string,
  input: UpdateKnowledgeInput
): Promise<KnowledgeItem> {
  const payload: Record<string, unknown> = {};
  if (input.personId !== undefined) payload.person_id = input.personId;
  if (input.eventId !== undefined) payload.event_id = input.eventId;
  if (input.legacyType !== undefined) payload.type = input.legacyType;
  if (input.title !== undefined) payload.title = input.title;
  if (input.value !== undefined) payload.value_text = input.value;
  if (input.content !== undefined) payload.content_text = input.content;
  if (input.occurredOn !== undefined) payload.occurred_on = input.occurredOn;
  if (input.importance !== undefined) payload.importance = input.importance;
  if (input.source !== undefined) payload.source = input.source;
  if (input.images !== undefined) {
    payload.images = assertPersistableMemoryImageValues(input.images);
  }

  const { data, error } = await supabase
    .from("memories")
    .update(payload)
    .eq("id", memoryId)
    .select(MEMORY_ROW_COLUMNS)
    .returns<MemoryRow[]>()
    .single();

  if (error) throw repositoryError("updateKnowledge", error.message);
  return mapLegacyMemoryToKnowledge(data);
}

export async function archiveKnowledge(
  memoryId: string
): Promise<KnowledgeItem> {
  const { data, error } = await supabase
    .from("memories")
    .update({ is_active: false })
    .eq("id", memoryId)
    .select(MEMORY_ROW_COLUMNS)
    .returns<MemoryRow[]>()
    .single();

  if (error) throw repositoryError("archiveKnowledge", error.message);
  return mapLegacyMemoryToKnowledge(data);
}
