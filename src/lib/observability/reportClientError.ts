"use client";

import { Capacitor } from "@capacitor/core";
import {
  normalizeTelemetryRoute,
  type ErrorSurface,
  type SafeClientErrorEvent,
} from "./errorEvent";

const reportedFingerprints = new Set<string>();

async function fingerprint(error: unknown): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  const name = error instanceof Error ? error.name : typeof error;
  const stack = error instanceof Error ? error.stack ?? "" : "";
  const bytes = new TextEncoder().encode(`${name}\n${stack}`.slice(0, 12_000));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function platform(): SafeClientErrorEvent["platform"] {
  const value = Capacitor.getPlatform();
  return value === "ios" || value === "android" ? value : "web";
}

export async function reportClientError(
  error: unknown,
  surface: ErrorSurface,
  digest: string | null = null,
): Promise<void> {
  try {
    const errorFingerprint = await fingerprint(error);
    const dedupeKey = errorFingerprint ?? `${surface}:${window.location.pathname}`;
    if (reportedFingerprints.has(dedupeKey) || reportedFingerprints.size >= 10) return;
    reportedFingerprints.add(dedupeKey);
    const event: SafeClientErrorEvent = {
      schemaVersion: 1,
      kind: "client_error",
      surface,
      route: normalizeTelemetryRoute(window.location.pathname),
      fingerprint: errorFingerprint,
      digest: digest && /^[a-zA-Z0-9._:-]{1,80}$/.test(digest) ? digest : null,
      platform: platform(),
      occurredAt: new Date().toISOString(),
    };
    await fetch("/api/telemetry/error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      cache: "no-store",
      credentials: "same-origin",
      keepalive: true,
    });
  } catch {
    // Observability must never become a second user-visible failure.
  }
}
