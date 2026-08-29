type SafeDiagnostic = {
  errorType: string;
  code: string | null;
  category: string | null;
  status: number | null;
  requestId: string | null;
};

const SAFE_VALUE = /^[a-zA-Z0-9._:-]{1,80}$/;
const ORCHESTRATION_REASONS = new Set(["home_daily_context"]);
const ORCHESTRATION_ACTIONS = new Set(["open_gift_assistant"]);
const ASSISTANT_BEHAVIOR_VERSIONS = new Set(["assistant-2026-08-23.1", "assistant-2026-08-29.1"]);
const AI_PRICING_VERSIONS = new Set(["gpt-4.1-mini-standard-2026-08-16"]);

type OrchestrationTraceInput = {
  memorySourceCount: number;
  careSourceCount: number;
  careReasonCodes: readonly string[];
  proposedActionTypes: readonly string[];
};

function safeToken(value: unknown): string | null {
  return typeof value === "string" && SAFE_VALUE.test(value) ? value : null;
}

function diagnosticFrom(error: unknown): SafeDiagnostic {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : null;
  const status = record && typeof record.status === "number" && Number.isInteger(record.status)
    ? record.status
    : null;
  return {
    errorType: safeToken(record?.errorType) ?? safeToken(record?.name) ?? (error instanceof Error ? safeToken(error.name) : null) ?? "unknown",
    code: safeToken(record?.code),
    category: safeToken(record?.category),
    status,
    requestId: safeToken(record?.requestId),
  };
}

function eventToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "unknown";
}

export function logOperationalError(scope: string, event: string, error?: unknown): void {
  console.error(JSON.stringify({ level: "error", service: "happydate", scope: eventToken(scope), event: eventToken(event), diagnostic: diagnosticFrom(error), occurredAt: new Date().toISOString() }));
}

export function logOperationalWarning(scope: string, event: string, error?: unknown): void {
  console.warn(JSON.stringify({ level: "warn", service: "happydate", scope: eventToken(scope), event: eventToken(event), diagnostic: diagnosticFrom(error), occurredAt: new Date().toISOString() }));
}

function countBucket(value: number): "0" | "1" | "2-5" | "6-20" | "21+" {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value === 1) return "1";
  if (value <= 5) return "2-5";
  if (value <= 20) return "6-20";
  return "21+";
}

/** Content-free, bounded operational signal for the three-brain boundary. */
export function logOrchestrationEvent(
  consumer: "home" | "assistant",
  outcome: "prepared" | "degraded" | "failed",
  trace: OrchestrationTraceInput,
  behaviorVersion?: string,
): void {
  console.info(JSON.stringify({
    level: "info",
    service: "happydate",
    scope: "three-brain-orchestration",
    event: outcome,
    consumer,
    memorySources: countBucket(trace.memorySourceCount),
    careSources: countBucket(trace.careSourceCount),
    reasonCodes: [...new Set(trace.careReasonCodes.filter((code) => ORCHESTRATION_REASONS.has(code)))].slice(0, 4),
    proposedActionTypes: [...new Set(trace.proposedActionTypes.filter((type) => ORCHESTRATION_ACTIONS.has(type)))].slice(0, 4),
    behaviorVersion: behaviorVersion && ASSISTANT_BEHAVIOR_VERSIONS.has(behaviorVersion)
      ? behaviorVersion
      : null,
    occurredAt: new Date().toISOString(),
  }));
}

function tokenBucket(value: number): "0" | "1-500" | "501-2k" | "2k-10k" | "10k+" {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value <= 500) return "1-500";
  if (value <= 2_000) return "501-2k";
  if (value <= 10_000) return "2k-10k";
  return "10k+";
}

export function logAiUsageEvent(input: {
  feature: "assistant" | "gift-recommendations";
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
  behaviorVersion?: string;
  pricingVersion: string;
}): void {
  const costBand = !Number.isFinite(input.estimatedUsd) || input.estimatedUsd <= 0
    ? "0"
    : input.estimatedUsd < 0.001 ? "under-0.001"
      : input.estimatedUsd < 0.01 ? "0.001-0.01"
        : input.estimatedUsd < 0.1 ? "0.01-0.1" : "0.1+";
  console.info(JSON.stringify({
    level: "info",
    service: "happydate",
    scope: "ai-cost",
    event: "usage-measured",
    feature: input.feature,
    inputTokens: tokenBucket(input.inputTokens),
    outputTokens: tokenBucket(input.outputTokens),
    costBand,
    behaviorVersion: input.behaviorVersion && ASSISTANT_BEHAVIOR_VERSIONS.has(input.behaviorVersion)
      ? input.behaviorVersion : null,
    pricingVersion: AI_PRICING_VERSIONS.has(input.pricingVersion) ? input.pricingVersion : null,
    occurredAt: new Date().toISOString(),
  }));
}
