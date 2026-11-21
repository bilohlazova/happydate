export type AiExecutionCode = "unauthorized" | "service_unavailable" | "rate_limited" | "daily_ai_budget_exceeded" | "provider_unavailable";

/** Deliberately contains no provider body, headers, prompt, or credential. */
export class AiExecutionError extends Error {
  readonly code: AiExecutionCode;
  readonly status: number;
  readonly retryAfterSeconds?: number;
  constructor(code: AiExecutionCode, status: number, retryAfterSeconds?: number) {
    super(code);
    this.name = "AiExecutionError";
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function aiExecutionFailureResponse(error: unknown): Response | null {
  if (!(error instanceof AiExecutionError)) return null;
  return Response.json({ error: error.code }, {
    status: error.status,
    headers: { "Cache-Control": "no-store", ...(error.retryAfterSeconds ? { "Retry-After": String(error.retryAfterSeconds) } : {}) },
  });
}
