export const ERROR_EVENT_MAX_BYTES = 4 * 1024;

export const ERROR_SURFACES = [
  "route-boundary",
  "global-boundary",
  "window-error",
  "unhandled-rejection",
] as const;

export type ErrorSurface = (typeof ERROR_SURFACES)[number];

export interface SafeClientErrorEvent {
  schemaVersion: 1;
  kind: "client_error";
  surface: ErrorSurface;
  route: string;
  fingerprint: string | null;
  digest: string | null;
  platform: "web" | "ios" | "android";
  occurredAt: string;
}

const SAFE_TOKEN = /^[a-zA-Z0-9._:-]+$/;
const FINGERPRINT = /^[a-f0-9]{16,64}$/;
const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
const OPAQUE_SEGMENT = /^[a-zA-Z0-9_-]{24,}$/;

export function normalizeTelemetryRoute(input: unknown): string {
  if (typeof input !== "string") return "/unknown";
  const pathname = input.split(/[?#]/, 1)[0] || "/";
  const normalized = pathname
    .slice(0, 300)
    .split("/")
    .map((segment, index, segments) => {
      if (!segment) return "";
      if (segment === ":id") return segment;
      if (segments[index - 1] === "people" && segment !== "add") return ":id";
      if (/^\d+$/.test(segment) || UUID_SEGMENT.test(segment) || OPAQUE_SEGMENT.test(segment)) return ":id";
      return encodeURIComponent(decodeURIComponentSafely(segment).slice(0, 48));
    })
    .join("/");
  return normalized.startsWith("/") ? normalized.slice(0, 160) : `/${normalized.slice(0, 159)}`;
}

function decodeURIComponentSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return "invalid";
  }
}

export function parseSafeClientErrorEvent(value: unknown): SafeClientErrorEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const allowedKeys = new Set([
    "schemaVersion", "kind", "surface", "route", "fingerprint", "digest", "platform", "occurredAt",
  ]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return null;
  if (record.schemaVersion !== 1 || record.kind !== "client_error") return null;
  if (!ERROR_SURFACES.includes(record.surface as ErrorSurface)) return null;
  if (record.platform !== "web" && record.platform !== "ios" && record.platform !== "android") return null;
  if (typeof record.route !== "string" || normalizeTelemetryRoute(record.route) !== record.route) return null;
  if (record.fingerprint !== null && (typeof record.fingerprint !== "string" || !FINGERPRINT.test(record.fingerprint))) return null;
  if (record.digest !== null && (typeof record.digest !== "string" || record.digest.length > 80 || !SAFE_TOKEN.test(record.digest))) return null;
  if (typeof record.occurredAt !== "string" || Number.isNaN(Date.parse(record.occurredAt))) return null;

  return record as unknown as SafeClientErrorEvent;
}
