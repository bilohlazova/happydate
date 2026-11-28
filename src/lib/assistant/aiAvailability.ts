export type AiAvailabilityErrorCode =
  | "daily_ai_budget_exceeded"
  | "rate_limited"
  | "ai_not_configured"
  | "request_failed";

const MAX_RETRY_AFTER_SECONDS = 90_000;

export function normalizeAiRetryAfter(value: unknown, fallback = 60): number {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return fallback;
  return Math.max(1, Math.min(MAX_RETRY_AFTER_SECONDS, Math.ceil(seconds)));
}

export function classifyAiAvailabilityError(input: {
  status: number;
  error: unknown;
  retryAfter?: unknown;
}): { code: AiAvailabilityErrorCode; retryAfter: number | null } {
  if (input.status === 429 && input.error === "daily_ai_budget_exceeded") {
    return {
      code: "daily_ai_budget_exceeded",
      retryAfter: normalizeAiRetryAfter(input.retryAfter, 3_600),
    };
  }
  if (input.status === 429 && input.error === "rate_limited") {
    return {
      code: "rate_limited",
      retryAfter: normalizeAiRetryAfter(input.retryAfter),
    };
  }
  if (input.status === 503 && input.error === "ai_not_configured") {
    return { code: "ai_not_configured", retryAfter: null };
  }
  return { code: "request_failed", retryAfter: null };
}

