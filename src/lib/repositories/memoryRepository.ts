// src/lib/repositories/memoryRepository.ts
// ─────────────────────────────────────────────────────────────────────────────
// Data Layer for Brain — Memory Repository.
// Read/write access to the `public.memories` table. No business logic,
// no aggregation, no scoring — that belongs to Brain/services, not here.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "@/lib/supabaseClient";
import { mapMemory } from "@/lib/brain/mappers/mapMemory";
import type { BrainMemory } from "@/lib/brain/types";
import type {
  FilterNotesMemoriesInput,
  MemoryRow,
  NotesMemoryPerson,
  NotesMemoryRow,
} from "./memory.types";
import { filterNotesMemories } from "./memory.types";
import {
  assertPersistableMemoryImageValues,
  DEFAULT_MEMORY_IMAGE_SIGNED_URL_EXPIRY,
  getOwnedMemoryImagePaths,
  MEMORY_IMAGES_BUCKET,
  prepareMemoryImagePathsForSigning,
  uploadMemoryImageFiles,
} from "@/lib/storage/memoryImages";
import {
  buildCreateNotesMemoryPayload,
  buildUpdateNotesMemoryPayload,
} from "@/lib/memories/notesMemoryTypes";
import type {
  NotesMemoryCreateFields,
  NotesMemoryUpdatePatch,
} from "@/lib/memories/notesMemoryTypes";
import type {
  MemoryImageUploadError,
  UploadMemoryImagesResult,
} from "@/lib/storage/memoryImages";

export type { MemoryImageUploadError, UploadMemoryImagesResult };

const NOTES_MEMORY_COLUMNS =
  "id, content_text, created_at, person_id, images, ai_tags, ai_summary, type, title, value_text, occurred_on";

export interface ListMemoriesInput {
  userId: string;
}

export type FilterMemoriesInput = FilterNotesMemoriesInput;

export interface CreateNotesMemoryInput extends NotesMemoryCreateFields {
  userId: string;
}

export type UpdateNotesMemoryInput = NotesMemoryUpdatePatch;

export interface MemoryImageSignedUrlResult {
  originalValue: string;
  objectPath: string | null;
  signedUrl: string | null;
  error: string | null;
}

export interface DeleteMemoryImageObjectsResult {
  deleted: string[];
  ignored: Array<{
    storedValue: string;
    objectPath: string | null;
    reason: "invalid_path" | "foreign_owner" | "not_authenticated";
  }>;
  failed: Array<{ objectPath: string; error: string }>;
}

export interface CreateMemoryInput {
  userId: string;
  personId: string;
  type: string;
  title: string;
  value: string;
  content?: string;
  occurredOn?: string;
}

/**
 * Return the currently authenticated user's id for client-side memory flows.
 */
export async function getCurrentMemoryUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

/**
 * Fetch the person projection used by the Notes filters and editor.
 * Ownership remains enforced by the same RLS policy as the previous direct
 * Notes query.
 */
export async function getNotesMemoryPeople(): Promise<NotesMemoryPerson[]> {
  const { data } = await supabase
    .from("people")
    .select("id, name, relation")
    .order("name");

  return data ?? [];
}

/**
 * Fetch the Notes projection for a user, newest first.
 */
export async function listMemories({
  userId,
}: ListMemoriesInput): Promise<NotesMemoryRow[]> {
  const { data } = await supabase
    .from("memories")
    .select(NOTES_MEMORY_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<NotesMemoryRow[]>();

  return data ?? [];
}

/**
 * Apply the Notes primary, person, and text filters without changing the
 * database query or result ordering used by the existing screen.
 */
export function filterMemories(
  input: FilterMemoriesInput
): NotesMemoryRow[] {
  return filterNotesMemories(input);
}

/**
 * Resolve legacy URLs and canonical object paths into temporary display URLs.
 * Paths are deduplicated and signed in one Storage request.
 */
export async function createMemoryImageSignedUrls(
  values: string[],
  expiresIn = DEFAULT_MEMORY_IMAGE_SIGNED_URL_EXPIRY
): Promise<MemoryImageSignedUrlResult[]> {
  const { entries, uniqueObjectPaths } =
    prepareMemoryImagePathsForSigning(values);

  if (uniqueObjectPaths.length === 0) {
    return entries.map((entry) => ({
      ...entry,
      signedUrl: null,
    }));
  }

  const { data, error } = await supabase.storage
    .from(MEMORY_IMAGES_BUCKET)
    .createSignedUrls(uniqueObjectPaths, expiresIn);

  const signedByPath = new Map<
    string,
    { signedUrl: string | null; error: string | null }
  >();

  uniqueObjectPaths.forEach((objectPath, index) => {
    const signedResult = data?.[index];
    const resultError = signedResult?.error
      ? String(signedResult.error)
      : error?.message ?? null;

    signedByPath.set(objectPath, {
      signedUrl: signedResult?.signedUrl ?? null,
      error:
        resultError ??
        (signedResult?.signedUrl ? null : "Unable to create signed URL"),
    });
  });

  return entries.map((entry) => {
    if (!entry.objectPath) {
      return { ...entry, signedUrl: null };
    }

    const signed = signedByPath.get(entry.objectPath);
    return {
      originalValue: entry.originalValue,
      objectPath: entry.objectPath,
      signedUrl: signed?.signedUrl ?? null,
      error: signed?.error ?? "Unable to create signed URL",
    };
  });
}

/**
 * Upload Notes images to owner-scoped canonical object paths. Successful paths
 * are retained even if another file in the same batch fails.
 */
export async function uploadMemoryImages(
  files: File[]
): Promise<UploadMemoryImagesResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user) {
    const message = authError?.message ?? "Zaloguj się ponownie przed wysłaniem zdjęć.";
    return {
      objectPaths: [],
      errors: files.map((file) => ({ fileName: file.name, error: message })),
    };
  }

  return uploadMemoryImageFiles(user.id, files, async (objectPath, file) => {
    const { error } = await supabase.storage
      .from(MEMORY_IMAGES_BUCKET)
      .upload(objectPath, file);
    return { error };
  });
}

/**
 * Safely remove only objects that belong to the authenticated user.
 * This helper is intentionally not connected to Notes lifecycle actions yet.
 */
export async function deleteMemoryImageObjects(
  storedValues: string[]
): Promise<DeleteMemoryImageObjectsResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      deleted: [],
      ignored: storedValues.map((storedValue) => ({
        storedValue,
        objectPath: null,
        reason: "not_authenticated" as const,
      })),
      failed: [],
    };
  }

  const { acceptedPaths, ignored } = getOwnedMemoryImagePaths(
    storedValues,
    user.id
  );

  if (acceptedPaths.length === 0) {
    return { deleted: [], ignored, failed: [] };
  }

  const { error } = await supabase.storage
    .from(MEMORY_IMAGES_BUCKET)
    .remove(acceptedPaths);

  if (error) {
    return {
      deleted: [],
      ignored,
      failed: acceptedPaths.map((objectPath) => ({
        objectPath,
        error: error.message,
      })),
    };
  }

  return { deleted: acceptedPaths, ignored, failed: [] };
}

/**
 * Create a free-form Notes memory with explicit compatibility metadata.
 * Other structured-memory columns remain omitted and untouched.
 */
export async function createNotesMemory(
  input: CreateNotesMemoryInput
): Promise<void> {
  const images = assertPersistableMemoryImageValues(input.images);
  const payload = buildCreateNotesMemoryPayload({ ...input, images });

  await supabase.from("memories").insert(payload);
}

/**
 * Update only the fields currently editable on the Notes screen.
 */
export async function updateNotesMemory(
  memoryId: string,
  input: UpdateNotesMemoryInput
): Promise<void> {
  const safeInput =
    input.images === undefined
      ? input
      : {
          ...input,
          images: assertPersistableMemoryImageValues(input.images),
        };
  const payload = buildUpdateNotesMemoryPayload(safeInput);

  await supabase
    .from("memories")
    .update(payload)
    .eq("id", memoryId);
}

/**
 * Hard-delete a memory, preserving the existing Notes behavior.
 */
export async function deleteMemory(memoryId: string): Promise<void> {
  await supabase.from("memories").delete().eq("id", memoryId);
}

/**
 * Fetch every memory record linked to a given person, regardless of
 * type or active status. Ordered by most recently created first.
 */
export async function getMemoriesForPerson(
  personId: string
): Promise<MemoryRow[]> {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("person_id", personId)
    .order("created_at", { ascending: false })
    .returns<MemoryRow[]>();

  if (error) {
    throw new Error(`[memoryRepository] getMemoriesForPerson failed: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Fetch all currently active memory records for a given user
 * (across all people/events), regardless of type. Ordered by most
 * recently created first.
 */
export async function getActiveMemories(
  userId: string
): Promise<MemoryRow[]> {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .returns<MemoryRow[]>();

  if (error) {
    throw new Error(`[memoryRepository] getActiveMemories failed: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Fetch active memories already mapped to the Brain model.
 */
export async function getBrainMemories(
  userId: string
): Promise<BrainMemory[]> {
  const rows = await getActiveMemories(userId);
  return rows.map(mapMemory);
}

/**
 * Insert a new memory record for a given user/person.
 * Pure write — no validation, no Brain mapping, no navigation.
 */
export async function createMemory(
  input: CreateMemoryInput
): Promise<MemoryRow> {
  const { data, error } = await supabase
    .from("memories")
    .insert({
      user_id: input.userId,
      person_id: input.personId,
      type: input.type,
      title: input.title,
      value_text: input.value,
      content_text: input.content ?? null,
      occurred_on: input.occurredOn || null,
      source: "manual",
      importance: 0,
      is_active: true,
    })
    .select()
    .returns<MemoryRow[]>()
    .single();

  if (error) {
    throw new Error(
      `[memoryRepository] createMemory failed: ${error.message}`
    );
  }

  return data;
}
