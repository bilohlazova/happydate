export const MEMORY_AUDIO_BUCKET = "memory-audio";
export const MAX_MEMORY_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_MEMORY_AUDIO_DURATION_SECONDS = 300;
export const DEFAULT_MEMORY_AUDIO_SIGNED_URL_EXPIRY = 3600;

export const ALLOWED_MEMORY_AUDIO_MIME_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-m4a",
]);

export function normalizeMemoryAudioMimeType(value: string): string {
  return value.toLowerCase().split(";", 1)[0]?.trim() ?? "";
}

export function validateMemoryAudioFile(file: { size: number; type: string }): string | null {
  if (file.size <= 0) return "empty_audio";
  if (file.size > MAX_MEMORY_AUDIO_SIZE_BYTES) return "audio_too_large";
  if (!ALLOWED_MEMORY_AUDIO_MIME_TYPES.has(normalizeMemoryAudioMimeType(file.type))) return "unsupported_audio";
  return null;
}

export function memoryAudioExtension(mimeType: string): string {
  switch (normalizeMemoryAudioMimeType(mimeType)) {
    case "audio/mp4":
    case "audio/x-m4a": return "m4a";
    case "audio/mpeg": return "mp3";
    case "audio/ogg": return "ogg";
    case "audio/wav": return "wav";
    default: return "webm";
  }
}

export function createMemoryAudioObjectPath(
  userId: string,
  mimeType: string,
  timestamp = Date.now(),
  randomValue = Math.random(),
): string {
  const randomPart = randomValue.toString(36).slice(2) || "audio";
  return `${userId}/${timestamp}-${randomPart}.${memoryAudioExtension(mimeType)}`;
}

export function extractMemoryAudioPath(value: string): string | null {
  try {
    const trimmed = value.trim();
    if (!trimmed) return null;
    let candidate = trimmed;
    if (/^https?:/i.test(trimmed)) {
      const url = new URL(trimmed);
      const markers = [
        `/storage/v1/object/public/${MEMORY_AUDIO_BUCKET}/`,
        `/storage/v1/object/sign/${MEMORY_AUDIO_BUCKET}/`,
      ];
      const marker = markers.find((item) => url.pathname.startsWith(item));
      if (!marker) return null;
      candidate = url.pathname.slice(marker.length);
    } else if (trimmed.startsWith("/") || trimmed.includes("\\") || trimmed.includes("?") || trimmed.includes("#")) {
      return null;
    }
    const segments = decodeURIComponent(candidate).split("/");
    if (segments.length !== 2 || segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
    return segments.join("/");
  } catch {
    return null;
  }
}

export function ownedMemoryAudioPath(value: string | null, userId: string): string | null {
  if (!value) return null;
  const path = extractMemoryAudioPath(value);
  return path?.startsWith(`${userId}/`) ? path : null;
}
