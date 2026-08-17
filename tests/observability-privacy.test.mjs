import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  normalizeTelemetryRoute,
  parseSafeClientErrorEvent,
} from "../src/lib/observability/errorEvent.ts";
import { logAiUsageEvent, logOperationalError, logOrchestrationEvent } from "../src/lib/observability/safeLogger.ts";

const ROOT = new URL("../", import.meta.url);

function safeEvent(overrides = {}) {
  return {
    schemaVersion: 1,
    kind: "client_error",
    surface: "route-boundary",
    route: "/people/:id",
    fingerprint: "a".repeat(64),
    digest: "NEXT_123",
    platform: "web",
    occurredAt: "2026-08-16T10:00:00.000Z",
    ...overrides,
  };
}

test("telemetry routes remove query strings and opaque person identifiers", () => {
  assert.equal(
    normalizeTelemetryRoute("/people/550e8400-e29b-41d4-a716-446655440000?note=private"),
    "/people/:id",
  );
  assert.equal(normalizeTelemetryRoute("/events/12345#details"), "/events/:id");
  assert.equal(normalizeTelemetryRoute("/people/abcdefghijklmnopqrstuvwxyz"), "/people/:id");
});

test("telemetry contract rejects free-form or identifying fields", () => {
  assert.deepEqual(parseSafeClientErrorEvent(safeEvent()), safeEvent());
  for (const forbidden of ["message", "stack", "email", "userId", "personId", "note"]) {
    assert.equal(parseSafeClientErrorEvent(safeEvent({ [forbidden]: "private" })), null);
  }
  assert.equal(parseSafeClientErrorEvent(safeEvent({ route: "/people/raw-person-id" })), null);
  assert.equal(parseSafeClientErrorEvent(safeEvent({ fingerprint: "not-a-hash" })), null);
});

test("telemetry endpoint is bounded, validated, throttled and never persists request content", async () => {
  const route = await readFile(new URL("src/app/api/telemetry/error/route.ts", ROOT), "utf8");
  assert.match(route, /readBoundedJson\(request, ERROR_EVENT_MAX_BYTES\)/);
  assert.match(route, /parseSafeClientErrorEvent/);
  assert.match(route, /createConfiguredAssistantRateLimiter/);
  assert.match(route, /getAssistantRequestIdentity/);
  assert.match(route, /status:\s*429/);
  assert.doesNotMatch(route, /request\.json\(/);
  assert.doesNotMatch(route, /\.from\(/);
});

test("client reporter hashes diagnostics locally and sends only the safe event", async () => {
  const reporter = await readFile(new URL("src/lib/observability/reportClientError.ts", ROOT), "utf8");
  assert.match(reporter, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(reporter, /normalizeTelemetryRoute/);
  assert.match(reporter, /reportedFingerprints\.size >= 10/);
  assert.doesNotMatch(reporter, /message:\s*error/);
  assert.doesNotMatch(reporter, /stack:/);
});

test("route and root failures have branded recoverable boundaries", async () => {
  const [routeBoundary, globalBoundary, fallback] = await Promise.all([
    readFile(new URL("src/app/error.tsx", ROOT), "utf8"),
    readFile(new URL("src/app/global-error.tsx", ROOT), "utf8"),
    readFile(new URL("src/components/ErrorFallback.tsx", ROOT), "utf8"),
  ]);
  assert.match(routeBoundary, /route-boundary/);
  assert.match(globalBoundary, /global-boundary/);
  assert.match(routeBoundary, /reset/);
  assert.match(globalBoundary, /reset/);
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    assert.match(fallback, new RegExp(`\\b${locale}:`));
  }
});

test("operational logger keeps only allowlisted diagnostics", () => {
  const original = console.error;
  const entries = [];
  console.error = (value) => entries.push(String(value));
  try {
    const error = Object.assign(new Error("private note text"), {
      code: "PGRST116",
      status: 406,
      requestId: "req_safe-1",
      details: "person@example.com",
    });
    logOperationalError("People Page", "Load failed", error);
  } finally {
    console.error = original;
  }
  assert.equal(entries.length, 1);
  const payload = JSON.parse(entries[0]);
  assert.equal(payload.scope, "people-page");
  assert.equal(payload.event, "load-failed");
  assert.equal(payload.diagnostic.errorType, "Error");
  assert.equal(payload.diagnostic.code, "PGRST116");
  assert.equal(payload.diagnostic.status, 406);
  assert.doesNotMatch(entries[0], /private note|person@example|details|message|stack/i);
});

test("three-brain telemetry buckets counts and drops private or unknown values", () => {
  const original = console.info;
  const entries = [];
  console.info = (value) => entries.push(String(value));
  try {
    logOrchestrationEvent("assistant", "prepared", {
      memorySourceCount: 2,
      careSourceCount: 53,
      careReasonCodes: ["home_daily_context", "Mum birthday private text"],
      proposedActionTypes: ["open_gift_assistant", "email:person@example.com"],
      privateNote: "likes a secret dress",
    }, "private-person-name");
  } finally {
    console.info = original;
  }
  assert.equal(entries.length, 1);
  const payload = JSON.parse(entries[0]);
  assert.equal(payload.memorySources, "2-5");
  assert.equal(payload.careSources, "21+");
  assert.deepEqual(payload.reasonCodes, ["home_daily_context"]);
  assert.deepEqual(payload.proposedActionTypes, ["open_gift_assistant"]);
  assert.equal(payload.behaviorVersion, null);
  assert.doesNotMatch(entries[0], /Mum|person@example|secret dress|privateNote/);
});

test("AI cost telemetry reports only buckets and allowlisted policy versions", () => {
  const original = console.info;
  const entries = [];
  console.info = (value) => entries.push(String(value));
  try {
    logAiUsageEvent({
      feature: "assistant",
      inputTokens: 1_234,
      outputTokens: 321,
      estimatedUsd: 0.001,
      behaviorVersion: "private-person-name",
      pricingVersion: "private-price-note",
    });
  } finally {
    console.info = original;
  }
  const payload = JSON.parse(entries[0]);
  assert.equal(payload.inputTokens, "501-2k");
  assert.equal(payload.outputTokens, "1-500");
  assert.equal(payload.costBand, "0.001-0.01");
  assert.equal(payload.behaviorVersion, null);
  assert.equal(payload.pricingVersion, null);
  assert.doesNotMatch(entries[0], /private-person|private-price|1234|321/);
});

test("runtime console output is confined to structured logger transports", async () => {
  const { readdir } = await import("node:fs/promises");
  const { join } = await import("node:path");
  async function sourceFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    return (await Promise.all(entries.map(async (entry) => {
      const target = join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(target);
      return /\.(ts|tsx)$/.test(entry.name) ? [target] : [];
    }))).flat();
  }
  const src = new URL("src/", ROOT).pathname;
  const allowed = new Set([
    new URL("src/lib/observability/safeLogger.ts", ROOT).pathname,
    new URL("src/app/api/telemetry/error/route.ts", ROOT).pathname,
  ]);
  const violations = [];
  for (const file of await sourceFiles(src)) {
    if (allowed.has(file)) continue;
    const source = await readFile(file, "utf8");
    if (/console\.(error|warn|log|info)\s*\(/.test(source)) violations.push(file.replace(src, "src/"));
  }
  assert.deepEqual(violations, []);
});
