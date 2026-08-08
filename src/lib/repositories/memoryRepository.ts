// src/lib/repositories/memoryRepository.ts
// ─────────────────────────────────────────────────────────────────────────────
// Compatibility adapter for Notes, manual capture and memory-image storage.
// All `public.memories` reads/writes are owned by Knowledge Repository.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "@/lib/supabaseClient";
import {
  createKnowledge,
  deleteKnowledge,
  listNotesKnowledgeProjection,
  updateKnowledge,
} from "./knowledgeRepository";
import type {
  FilterNotesMemoriesInput,
  NotesMemoryPerson,
  NotesMemoryRow,
  NotesMemoryEvent,
} from "./memory.types";
import { listCalendarEvents } from "./events";
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
  createMemoryAudioObjectPath,
  DEFAULT_MEMORY_AUDIO_SIGNED_URL_EXPIRY,
  MEMORY_AUDIO_BUCKET,
  ownedMemoryAudioPath,
  validateMemoryAudioFile,
} from "@/lib/storage/memoryAudio";
import type {
  NotesMemoryCreateFields,
  NotesMemoryUpdatePatch,
} from "@/lib/memories/notesMemoryTypes";
import type {
  MemoryImageUploadError,
  UploadMemoryImagesResult,
} from "@/lib/storage/memoryImages";

export type { MemoryImageUploadError, UploadMemoryImagesResult };

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

export interface MemoryAudioUploadResult {
  objectPath: string | null;
  error: string | null;
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
    .select("id, name, relationship, relation_label")
    .order("name");

  return (data ?? []).map((person) => ({
    id: person.id,
    name: person.name,
    relation: person.relation_label ?? person.relationship ?? null,
  }));
}

export async function getNotesMemoryEvents(userId: string): Promise<NotesMemoryEvent[]> {
  const events = await listCalendarEvents(userId);
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date,
    personId: event.personId,
  }));
}

export async function createMemoryAudioSignedUrl(
  storedValue: string | null,
  expiresIn = DEFAULT_MEMORY_AUDIO_SIGNED_URL_EXPIRY,
): Promise<string | null> {
  if (!storedValue) return null;
  const userId = await getCurrentMemoryUserId();
  if (!userId) return null;
  const objectPath = ownedMemoryAudioPath(storedValue, userId);
  if (!objectPath) return null;
  const { data, error } = await supabase.storage
    .from(MEMORY_AUDIO_BUCKET)
    .createSignedUrl(objectPath, expiresIn);
  return error ? null : data.signedUrl;
}

export async function uploadMemoryAudio(file: File): Promise<MemoryAudioUploadResult> {
  const userId = await getCurrentMemoryUserId();
  if (!userId) return { objectPath: null, error: "auth_required" };
  const validationError = validateMemoryAudioFile(file);
  if (validationError) return { objectPath: null, error: validationError };
  const objectPath = createMemoryAudioObjectPath(userId, file.type);
  const { error } = await supabase.storage.from(MEMORY_AUDIO_BUCKET).upload(objectPath, file);
  return error ? { objectPath: null, error: error.message } : { objectPath, error: null };
}

export async function deleteMemoryAudioObject(storedValue: string | null): Promise<boolean> {
  const userId = await getCurrentMemoryUserId();
  if (!userId) return false;
  const objectPath = ownedMemoryAudioPath(storedValue, userId);
  if (!objectPath) return false;
  const { error } = await supabase.storage.from(MEMORY_AUDIO_BUCKET).remove([objectPath]);
  return !error;
}

/**
 * Fetch the Notes projection for a user, newest first.
 */
export async function listMemories({
  userId,
}: ListMemoriesInput): Promise<NotesMemoryRow[]> {
  try {
    return await listNotesKnowledgeProjection({ userId });
  } catch {
    return [];
  }
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
  await createKnowledge({
    userId: input.userId,
    personId: input.personId ?? null,
    eventId: input.eventId ?? null,
    legacyType: input.type,
    title: input.title ?? null,
    value: input.valueText ?? null,
    content: input.contentText ?? null,
    occurredOn: input.occurredOn ?? null,
    source: "manual",
    images: input.images === null ? null : images,
    audioUrl: input.audioUrl ?? null,
  });
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
  await updateKnowledge(memoryId, {
    ...(safeInput.title !== undefined ? { title: safeInput.title } : {}),
    ...(safeInput.contentText !== undefined ? { content: safeInput.contentText } : {}),
    ...(safeInput.valueText !== undefined ? { value: safeInput.valueText } : {}),
    ...(safeInput.personId !== undefined ? { personId: safeInput.personId } : {}),
    ...(safeInput.eventId !== undefined ? { eventId: safeInput.eventId } : {}),
    ...(safeInput.occurredOn !== undefined ? { occurredOn: safeInput.occurredOn } : {}),
    ...(safeInput.images !== undefined ? { images: safeInput.images } : {}),
    ...(safeInput.audioUrl !== undefined ? { audioUrl: safeInput.audioUrl } : {}),
  });
}

/**
 * Hard-delete a memory, preserving the existing Notes behavior.
 */
export async function deleteMemory(memoryId: string): Promise<void> {
  await deleteKnowledge(memoryId);
}
