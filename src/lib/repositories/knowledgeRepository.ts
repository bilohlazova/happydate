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
import { MEMORY_ROW_COLUMNS, type MemoryRow, type NotesMemoryRow } from "./memory.types";
import { assertPersistableMemoryImageValues } from "@/lib/storage/memoryImages";

export interface ListKnowledgeInput {
  userId: string;
  includeArchived?: boolean;
}

export interface GetKnowledgeForPersonInput {
  personId: string;
  includeArchived?: boolean;
}

export interface ListKnowledgeForOwnedPersonInput {
  userId: string;
  personId: string;
  includeArchived?: boolean;
}

export interface GetKnowledgeContextInput
  extends ListKnowledgeInput,
    KnowledgeContextOptions {}

export interface MutateOwnedPersonKnowledgeInput {
  userId: string;
  personId: string;
  knowledgeId: string;
}

export interface KnowledgeChangeHistoryRow {
  id: string;
  memory_id: string;
  previous_value: string;
  new_value: string;
  changed_at: string;
}

/**
 * Canonical writes currently target the legacy persistence schema. Fields that
 * cannot be represented losslessly (classification and state history) are
 * intentionally not accepted before a future additive migration. Controlled
 * semantic tags may carry Happy Learning polarity through compatibility reads.
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
  sourceRecordId?: string | null;
  sourceExcerpt?: string | null;
  userConfirmedAt?: string | null;
  captureSchemaVersion?: string | null;
  images?: string[] | null;
  aiTags?: string[];
  audioUrl?: string | null;
  transcriptText?: string | null;
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
  images?: string[] | null;
  audioUrl?: string | null;
  transcriptText?: string | null;
}

function repositoryError(operation: string, message: string): Error {
  return new Error(`[knowledgeRepository] ${operation} failed: ${message}`);
}

async function requireKnowledgeUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw repositoryError("authentication", error.message);
  if (!data.user) throw repositoryError("authentication", "Authentication required");
  return data.user.id;
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
  const images = input.images === null
    ? null
    : assertPersistableMemoryImageValues(input.images ?? []);
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
      source_record_id: input.sourceRecordId ?? null,
      source_excerpt: input.sourceExcerpt ?? null,
      user_confirmed_at: input.userConfirmedAt ?? null,
      capture_schema_version: input.captureSchemaVersion ?? null,
      images,
      audio_url: input.audioUrl ?? null,
      transcript_text: input.transcriptText ?? null,
      ai_tags: input.aiTags ?? [],
      is_active: true,
    })
    .select(MEMORY_ROW_COLUMNS)
    .returns<MemoryRow[]>()
    .single();

  if (error?.code === "23505" && input.sourceRecordId) {
    const { data: existing, error: existingError } = await client
      .from("memories")
      .select(MEMORY_ROW_COLUMNS)
      .eq("user_id", input.userId)
      .eq("source", input.source ?? "manual")
      .eq("source_record_id", input.sourceRecordId)
      .returns<MemoryRow[]>()
      .single();
    if (!existingError && existing) return mapLegacyMemoryToKnowledge(existing);
  }
  if (error) throw repositoryError("createKnowledge", error.message);
  return mapLegacyMemoryToKnowledge(data);
}

/** @internal Raw compatibility read used by legacy repository methods. */
async function listKnowledgeRowsWithClient(client: SupabaseClient, {
  userId,
  includeArchived = false,
}: ListKnowledgeInput): Promise<MemoryRow[]> {
  let query = client
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
async function listKnowledgeRowsForPerson({
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

async function listOwnedKnowledgeRowsWithClient(
  client: SupabaseClient,
  {
  userId,
  personId,
  includeArchived = false,
  }: ListKnowledgeForOwnedPersonInput,
): Promise<MemoryRow[]> {
  let query = client
    .from("memories")
    .select(MEMORY_ROW_COLUMNS)
    .eq("user_id", userId)
    .eq("person_id", personId);

  if (!includeArchived) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .returns<MemoryRow[]>();

  if (error) {
    throw repositoryError("listKnowledgeRowsForOwnedPersonOnServer", error.message);
  }
  return data ?? [];
}

async function listOwnedKnowledgeRowsOnServer(
  input: ListKnowledgeForOwnedPersonInput,
): Promise<MemoryRow[]> {
  return listOwnedKnowledgeRowsWithClient(serverSupabaseClient(), input);
}

export async function listKnowledge(
  input: ListKnowledgeInput
): Promise<KnowledgeItem[]> {
  const rows = await listKnowledgeRowsWithClient(supabase, input);
  return mapLegacyMemoriesToKnowledge(rows);
}

/** Owner-scoped Knowledge read for an already authenticated RLS client. */
export async function listKnowledgeWithClient(
  client: SupabaseClient,
  input: ListKnowledgeInput,
): Promise<KnowledgeItem[]> {
  const rows = await listKnowledgeRowsWithClient(client, input);
  return mapLegacyMemoriesToKnowledge(rows);
}

/** Raw owner export retained behind the canonical Knowledge persistence boundary. */
export async function exportOwnedKnowledgeRows(userId: string): Promise<MemoryRow[]> {
  const authenticatedUserId = await requireKnowledgeUserId();
  if (authenticatedUserId !== userId) throw repositoryError("exportOwnedKnowledgeRows", "Invalid owner");
  const result: MemoryRow[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("memories")
      .select(MEMORY_ROW_COLUMNS)
      .eq("user_id", authenticatedUserId)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1)
      .returns<MemoryRow[]>();
    if (error) throw repositoryError("exportOwnedKnowledgeRows", error.message);
    const page = data ?? [];
    result.push(...page);
    if (page.length < pageSize) return result;
  }
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

export async function listKnowledgeForOwnedPersonOnServer(
  input: ListKnowledgeForOwnedPersonInput
): Promise<KnowledgeItem[]> {
  return mapLegacyMemoriesToKnowledge(
    await listOwnedKnowledgeRowsOnServer(input)
  );
}

export async function listKnowledgeForOwnedPersonWithClient(
  client: SupabaseClient,
  input: ListKnowledgeForOwnedPersonInput,
): Promise<KnowledgeItem[]> {
  return mapLegacyMemoriesToKnowledge(
    await listOwnedKnowledgeRowsWithClient(client, input),
  );
}

export async function listKnowledgeChangeHistoryForOwnedPerson(
  input: { userId: string; personId: string },
): Promise<KnowledgeChangeHistoryRow[]> {
  const authenticatedUserId = await requireKnowledgeUserId();
  if (authenticatedUserId !== input.userId) throw repositoryError("listKnowledgeChangeHistoryForOwnedPerson", "Invalid owner");
  const { data, error } = await supabase
    .from("memory_knowledge_changes")
    .select("id, memory_id, previous_value, new_value, changed_at")
    .eq("user_id", authenticatedUserId)
    .eq("person_id", input.personId)
    .order("changed_at", { ascending: false })
    .limit(200)
    .returns<KnowledgeChangeHistoryRow[]>();
  if (error) throw repositoryError("listKnowledgeChangeHistoryForOwnedPerson", error.message);
  return data ?? [];
}

/** Canonical persistence projection retained for the current Notes UI. */
export async function listNotesKnowledgeProjection({
  userId,
}: ListKnowledgeInput): Promise<NotesMemoryRow[]> {
  const rows = await listKnowledgeRowsWithClient(supabase, { userId, includeArchived: true });
  return rows.map((row) => ({
    id: row.id,
    content_text: row.content_text,
    created_at: row.created_at ?? "",
    person_id: row.person_id,
    event_id: row.event_id,
    audio_url: row.audio_url,
    transcript_text: row.transcript_text,
    images: row.images,
    ai_tags: row.ai_tags,
    ai_summary: row.ai_summary,
    type: row.type,
    title: row.title,
    value_text: row.value_text,
    occurred_on: row.occurred_on,
  }));
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
  const userId = await requireKnowledgeUserId();
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
    payload.images = input.images === null
      ? null
      : assertPersistableMemoryImageValues(input.images);
  }
  if (input.audioUrl !== undefined) payload.audio_url = input.audioUrl;
  if (input.transcriptText !== undefined) payload.transcript_text = input.transcriptText;

  const { data, error } = await supabase
    .from("memories")
    .update(payload)
    .eq("id", memoryId)
    .eq("user_id", userId)
    .select(MEMORY_ROW_COLUMNS)
    .returns<MemoryRow[]>()
    .single();

  if (error) throw repositoryError("updateKnowledge", error.message);
  return mapLegacyMemoryToKnowledge(data);
}

export async function archiveKnowledge(
  memoryId: string
): Promise<KnowledgeItem> {
  const userId = await requireKnowledgeUserId();
  const { data, error } = await supabase
    .from("memories")
    .update({ is_active: false })
    .eq("id", memoryId)
    .eq("user_id", userId)
    .select(MEMORY_ROW_COLUMNS)
    .returns<MemoryRow[]>()
    .single();

  if (error) throw repositoryError("archiveKnowledge", error.message);
  return mapLegacyMemoryToKnowledge(data);
}

/** Narrow Person Profile mutation: only the value of one active owned item. */
export async function updateOwnedPersonKnowledgeValue(
  input: MutateOwnedPersonKnowledgeInput & { value: string },
): Promise<KnowledgeItem> {
  const authenticatedUserId = await requireKnowledgeUserId();
  const value = input.value.replace(/\s+/g, " ").trim();
  if (authenticatedUserId !== input.userId || !value || value.length > 500) {
    throw repositoryError("updateOwnedPersonKnowledgeValue", "Invalid knowledge update");
  }
  const { data, error } = await supabase
    .from("memories")
    .update({ value_text: value, knowledge_reviewed_at: new Date().toISOString(), knowledge_review_snoozed_until: null })
    .eq("id", input.knowledgeId)
    .eq("user_id", authenticatedUserId)
    .eq("person_id", input.personId)
    .eq("is_active", true)
    .select(MEMORY_ROW_COLUMNS)
    .returns<MemoryRow[]>()
    .single();
  if (error) throw repositoryError("updateOwnedPersonKnowledgeValue", error.message);
  return mapLegacyMemoryToKnowledge(data);
}

/** Archive one active owned Person fact without deleting its audit history. */
export async function archiveOwnedPersonKnowledge(
  input: MutateOwnedPersonKnowledgeInput,
): Promise<KnowledgeItem> {
  const authenticatedUserId = await requireKnowledgeUserId();
  if (authenticatedUserId !== input.userId) {
    throw repositoryError("archiveOwnedPersonKnowledge", "Invalid owner");
  }
  const { data, error } = await supabase
    .from("memories")
    .update({ is_active: false })
    .eq("id", input.knowledgeId)
    .eq("user_id", authenticatedUserId)
    .eq("person_id", input.personId)
    .eq("is_active", true)
    .select(MEMORY_ROW_COLUMNS)
    .returns<MemoryRow[]>()
    .single();
  if (error) throw repositoryError("archiveOwnedPersonKnowledge", error.message);
  return mapLegacyMemoryToKnowledge(data);
}

/** Restore one archived owned Person fact to active Knowledge. */
export async function restoreOwnedPersonKnowledge(
  input: MutateOwnedPersonKnowledgeInput,
): Promise<KnowledgeItem> {
  const authenticatedUserId = await requireKnowledgeUserId();
  if (authenticatedUserId !== input.userId) throw repositoryError("restoreOwnedPersonKnowledge", "Invalid owner");
  const { data, error } = await supabase
    .from("memories")
    .update({ is_active: true })
    .eq("id", input.knowledgeId)
    .eq("user_id", authenticatedUserId)
    .eq("person_id", input.personId)
    .eq("is_active", false)
    .select(MEMORY_ROW_COLUMNS)
    .returns<MemoryRow[]>()
    .single();
  if (error) throw repositoryError("restoreOwnedPersonKnowledge", error.message);
  return mapLegacyMemoryToKnowledge(data);
}

/** Permanently delete one archived owned Person fact after explicit UI confirmation. */
export async function deleteArchivedOwnedPersonKnowledge(
  input: MutateOwnedPersonKnowledgeInput,
): Promise<void> {
  const authenticatedUserId = await requireKnowledgeUserId();
  if (authenticatedUserId !== input.userId) throw repositoryError("deleteArchivedOwnedPersonKnowledge", "Invalid owner");
  const { data, error } = await supabase
    .from("memories")
    .delete()
    .eq("id", input.knowledgeId)
    .eq("user_id", authenticatedUserId)
    .eq("person_id", input.personId)
    .eq("is_active", false)
    .select("id")
    .returns<Array<{ id: string }>>()
    .single();
  if (error || !data) throw repositoryError("deleteArchivedOwnedPersonKnowledge", error?.message ?? "Record not found");
}

export async function resolveOwnedPersonKnowledgeConflict(input: {
  userId: string;
  personId: string;
  winnerId: string;
  loserIds: string[];
}): Promise<number> {
  const authenticatedUserId = await requireKnowledgeUserId();
  const loserIds = [...new Set(input.loserIds)];
  if (authenticatedUserId !== input.userId || !input.winnerId || loserIds.length < 1 || loserIds.length > 10 || loserIds.includes(input.winnerId)) {
    throw repositoryError("resolveOwnedPersonKnowledgeConflict", "Invalid conflict resolution");
  }
  const { data, error } = await supabase.rpc("resolve_memory_knowledge_conflict", {
    p_person_id: input.personId,
    p_winner_id: input.winnerId,
    p_loser_ids: loserIds,
  });
  if (error || data !== loserIds.length) throw repositoryError("resolveOwnedPersonKnowledgeConflict", error?.message ?? "Incomplete conflict resolution");
  return data;
}

export async function reviewOwnedPersonKnowledge(input: MutateOwnedPersonKnowledgeInput & { action: "confirm" | "snooze" }): Promise<KnowledgeItem> {
  const authenticatedUserId = await requireKnowledgeUserId();
  if (authenticatedUserId !== input.userId) throw repositoryError("reviewOwnedPersonKnowledge", "Invalid owner");
  const now = new Date();
  const payload = input.action === "confirm"
    ? { knowledge_reviewed_at: now.toISOString(), knowledge_review_snoozed_until: null }
    : { knowledge_review_snoozed_until: new Date(now.getTime() + 30 * 86_400_000).toISOString() };
  const { data, error } = await supabase
    .from("memories")
    .update(payload)
    .eq("id", input.knowledgeId)
    .eq("user_id", authenticatedUserId)
    .eq("person_id", input.personId)
    .eq("is_active", true)
    .not("user_confirmed_at", "is", null)
    .select(MEMORY_ROW_COLUMNS)
    .returns<MemoryRow[]>()
    .single();
  if (error) throw repositoryError("reviewOwnedPersonKnowledge", error.message);
  return mapLegacyMemoryToKnowledge(data);
}

/** Permanently delete one owned Knowledge record through the canonical RLS client. */
export async function deleteKnowledge(memoryId: string): Promise<void> {
  const userId = await requireKnowledgeUserId();
  const { error } = await supabase
    .from("memories")
    .delete()
    .eq("id", memoryId)
    .eq("user_id", userId);

  if (error) throw repositoryError("deleteKnowledge", error.message);
}
