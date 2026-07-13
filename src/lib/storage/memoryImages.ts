export const MEMORY_IMAGES_BUCKET = "memory-images";
export const DEFAULT_MEMORY_IMAGE_SIGNED_URL_EXPIRY = 3600;
export const MAX_MEMORY_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MEMORY_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const PUBLIC_URL_MARKER =
  `/storage/v1/object/public/${MEMORY_IMAGES_BUCKET}/`;
const SIGNED_URL_MARKER =
  `/storage/v1/object/sign/${MEMORY_IMAGES_BUCKET}/`;

export interface PreparedMemoryImageValue {
  originalValue: string;
  objectPath: string | null;
  error: string | null;
}

export interface PreparedMemoryImagePaths {
  entries: PreparedMemoryImageValue[];
  uniqueObjectPaths: string[];
}

export interface ResolvedMemoryImage {
  storedValue: string;
  objectPath: string;
  displayUrl: string;
}

export interface OwnedMemoryImagePathResult {
  acceptedPaths: string[];
  ignored: Array<{
    storedValue: string;
    objectPath: string | null;
    reason: "invalid_path" | "foreign_owner";
  }>;
}

export interface MemoryImageUploadFile {
  name: string;
  size: number;
  type: string;
}

export interface MemoryImageUploadError {
  fileName: string;
  error: string;
}

export interface UploadMemoryImagesResult {
  objectPaths: string[];
  errors: MemoryImageUploadError[];
}

function normalizeObjectPath(candidate: string): string | null {
  try {
    const trimmed = candidate.trim();
    if (
      !trimmed ||
      trimmed.startsWith("/") ||
      trimmed.startsWith("\\") ||
      /^[a-zA-Z]:[\\/]/.test(trimmed) ||
      trimmed.includes("\\") ||
      trimmed.includes("?") ||
      trimmed.includes("#")
    ) {
      return null;
    }

    const decoded = decodeURIComponent(trimmed);
    const segments = decoded.split("/");

    if (
      segments.length < 2 ||
      segments.some(
        (segment) => !segment || segment === "." || segment === ".."
      )
    ) {
      return null;
    }

    const filename = segments.at(-1);
    if (!filename?.trim()) return null;

    return segments.join("/");
  } catch {
    return null;
  }
}

/**
 * Convert a legacy public URL, temporary signed URL, or canonical stored path
 * into a safe `user-id/filename` object path without mutating its source.
 */
export function extractMemoryImagePath(value: string): string | null {
  try {
    if (typeof value !== "string") return null;

    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith("file:")) return null;

    const looksLikeUrl = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);
    if (!looksLikeUrl) {
      return normalizeObjectPath(trimmed);
    }

    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    const marker = url.pathname.startsWith(PUBLIC_URL_MARKER)
      ? PUBLIC_URL_MARKER
      : url.pathname.startsWith(SIGNED_URL_MARKER)
        ? SIGNED_URL_MARKER
        : null;

    if (!marker) return null;

    const markerIndex = url.pathname.indexOf(marker);
    const encodedPath = url.pathname.slice(markerIndex + marker.length);
    return normalizeObjectPath(encodedPath);
  } catch {
    return null;
  }
}

/**
 * Parse values once and produce a deduplicated path list for batched signing.
 * Entry order always matches the original array order.
 */
export function prepareMemoryImagePathsForSigning(
  values: string[]
): PreparedMemoryImagePaths {
  const entries = values.map((originalValue) => {
    const objectPath = extractMemoryImagePath(originalValue);
    return {
      originalValue,
      objectPath,
      error: objectPath ? null : "Invalid memory image value",
    };
  });

  const uniqueObjectPaths = Array.from(
    new Set(
      entries.flatMap((entry) =>
        entry.objectPath ? [entry.objectPath] : []
      )
    )
  );

  return { entries, uniqueObjectPaths };
}

/**
 * Preserve raw database values while preventing temporary signed credentials
 * from ever entering a persistence payload.
 */
export function assertPersistableMemoryImageValues(
  values: string[] | null
): string[] | null {
  if (!values) return null;

  for (const value of values) {
    if (
      value.includes(SIGNED_URL_MARKER) ||
      /[?&](?:token|signature)=/i.test(value)
    ) {
      throw new Error("Signed memory image URLs cannot be persisted");
    }
  }

  return [...values];
}

/**
 * Generate the canonical path used for a newly uploaded file.
 */
export function createMemoryImageObjectPath(
  userId: string,
  originalFilename: string,
  timestamp = Date.now(),
  randomValue = Math.random()
): string {
  const rawExtension = originalFilename.split(".").pop() ?? "image";
  const extension = rawExtension.toLowerCase().replace(/[^a-z0-9]/g, "") || "image";
  const randomPart = randomValue.toString(36).slice(2) || "image";
  return `${userId}/${timestamp}-${randomPart}.${extension}`;
}

export function validateMemoryImageFile(file: {
  name: string;
  size: number;
  type: string;
}): string | null {
  if (file.size > MAX_MEMORY_IMAGE_SIZE_BYTES) {
    return `${file.name}: plik przekracza limit 10 MB.`;
  }

  if (!ALLOWED_MEMORY_IMAGE_MIME_TYPES.has(file.type.toLowerCase())) {
    return `${file.name}: nieobsługiwany format obrazu.`;
  }

  return null;
}

/**
 * Validate and upload a batch while retaining successful canonical paths when
 * another file fails. The transport callback keeps this orchestration pure and
 * independently testable from Supabase.
 */
export async function uploadMemoryImageFiles<
  TFile extends MemoryImageUploadFile,
>(
  userId: string,
  files: TFile[],
  uploadObject: (
    objectPath: string,
    file: TFile
  ) => Promise<{ error: { message: string } | null }>
): Promise<UploadMemoryImagesResult> {
  const objectPaths: string[] = [];
  const errors: MemoryImageUploadError[] = [];

  for (const file of files) {
    const validationError = validateMemoryImageFile(file);
    if (validationError) {
      errors.push({ fileName: file.name, error: validationError });
      continue;
    }

    const objectPath = createMemoryImageObjectPath(userId, file.name);
    const { error } = await uploadObject(objectPath, file);

    if (error) {
      errors.push({
        fileName: file.name,
        error: `${file.name}: ${error.message}`,
      });
    } else {
      objectPaths.push(objectPath);
    }
  }

  return { objectPaths, errors };
}

/**
 * Select only paths owned by the authenticated user and deduplicate them for
 * one safe Storage deletion request.
 */
export function getOwnedMemoryImagePaths(
  storedValues: string[],
  userId: string
): OwnedMemoryImagePathResult {
  const accepted = new Set<string>();
  const ignored: OwnedMemoryImagePathResult["ignored"] = [];
  const ownerPrefix = `${userId}/`;

  for (const storedValue of storedValues) {
    const objectPath = extractMemoryImagePath(storedValue);

    if (!objectPath) {
      ignored.push({ storedValue, objectPath: null, reason: "invalid_path" });
    } else if (!objectPath.startsWith(ownerPrefix)) {
      ignored.push({ storedValue, objectPath, reason: "foreign_owner" });
    } else {
      accepted.add(objectPath);
    }
  }

  return { acceptedPaths: Array.from(accepted), ignored };
}
