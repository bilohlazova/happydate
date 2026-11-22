import { isAiEgressDenied, readHostedSessionConfig, reserveHostedTestSession } from "./hostedTestSession.server.ts";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { AI_COST_POLICY, createConfiguredAiBudget, type AiBudget, type AiTokenUsage } from "./aiBudget.ts";
import { createConfiguredAssistantRateLimiter, type AssistantRateLimiter } from "./rateLimiter.ts";
import { AiExecutionError } from "./aiExecutionError.ts";
import { logOperationalWarning } from "../observability/safeLogger.ts";

type Identity = { kind: "authenticated" | "guest" | "background"; key: string };
type Controls = { budget?: AiBudget | null; limiter?: AssistantRateLimiter | null };
type Scope = { identity: Identity; controls: Controls };
const scopes = new AsyncLocalStorage<Scope>();

/** Only trusted server boundaries may establish identity; never read it from a model or request body. */
export function withAiExecutionScope<T>(identity: Identity, run: () => T, controls?: Controls): T {
  return scopes.run({ identity, controls: controls ?? scopes.getStore()?.controls ?? {} }, run);
}

export function assertPricedAiModel(model: string): void {
  // Different models must get an explicitly reviewed policy, never this model's price by default.
  if (model !== AI_COST_POLICY.model && model !== "gpt-4.1-mini-2025-04-14") throw new AiExecutionError("service_unavailable", 503);
}

/** Include instructions, schemas, tool definitions and messages in the conservative byte bound. */
export function estimateAiPayloadTokens(payload: unknown): number {
  const serialized = JSON.stringify(payload);
  if (!serialized) throw new AiExecutionError("service_unavailable", 503);
  return new TextEncoder().encode(serialized).byteLength + 4096;
}

export function parseOpenAiUsage(value: unknown, format: "responses" | "chat"): AiTokenUsage | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const inputTokens = record[format === "responses" ? "input_tokens" : "prompt_tokens"];
  const outputTokens = record[format === "responses" ? "output_tokens" : "completion_tokens"];
  const valid = (x: unknown): x is number => typeof x === "number" && Number.isSafeInteger(x) && x >= 0 && x <= 10_000_000;
  if (!valid(inputTokens) || inputTokens === 0 || !valid(outputTokens)) return null;
  if (record.total_tokens !== undefined && record.total_tokens !== inputTokens + outputTokens) return null;
  return { inputTokens, outputTokens };
}

type Call<T> = {
  feature: string;
  model: string;
  payload: unknown;
  maxOutputTokens: number;
  /** Extra input-token units reserved up front for provider fees that are not tokens (e.g. web search calls). */
  reservedInputOverhead?: number;
  call: () => Promise<T>;
  usage: (result: T) => AiTokenUsage | null;
};

async function reserve(input: Pick<Call<unknown>, "feature" | "model" | "payload" | "maxOutputTokens" | "reservedInputOverhead">) {
  assertPricedAiModel(input.model);
  const scope = scopes.getStore();
  if (!scope?.identity.key?.trim() || scope.identity.key.length > 256 || !["authenticated", "guest", "background"].includes(scope.identity.kind) || (scope.identity.kind === "guest" && input.feature !== "chat")) throw new AiExecutionError("unauthorized", 401);
  if (!Number.isSafeInteger(input.maxOutputTokens) || input.maxOutputTokens <= 0) throw new AiExecutionError("service_unavailable", 503);
  const overhead = input.reservedInputOverhead ?? 0;
  if (!Number.isSafeInteger(overhead) || overhead < 0 || overhead > 1_000_000) throw new AiExecutionError("service_unavailable", 503);
  const estimatedInput = estimateAiPayloadTokens(input.payload) + overhead;
  readHostedSessionConfig();
  const mode = scope.identity.kind === "background" ? "production" : process.env.NODE_ENV;
  const environment = { UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN, OPENAI_DAILY_BUDGET_USD: process.env.OPENAI_DAILY_BUDGET_USD };
  const limiter = scope.controls.limiter === undefined ? createConfiguredAssistantRateLimiter(environment, mode) : scope.controls.limiter;
  const budget = scope.controls.budget === undefined ? createConfiguredAiBudget(environment, mode) : scope.controls.budget;
  if (!limiter || !budget) throw new AiExecutionError("service_unavailable", 503);
  const key = createHash("sha256").update(`ai:${input.feature}:${scope.identity.kind}:${scope.identity.key}`).digest("hex");
  let release: (() => Promise<void>) | undefined;
  try {
    const limit = await limiter.check(key, scope.identity.kind === "guest" ? "guest" : "authenticated");
    if (!limit.allowed) throw new AiExecutionError("rate_limited", 429, Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000)));
    if (limiter.acquire) {
      release = await limiter.acquire(key) ?? undefined;
      if (!release) throw new AiExecutionError("rate_limited", 429, 5);
    }
    const result = await budget.reserve(estimatedInput, input.maxOutputTokens);
    if (!result.allowed) throw new AiExecutionError("daily_ai_budget_exceeded", 429, result.retryAfterSeconds);
    const session = await reserveHostedTestSession(estimatedInput, input.maxOutputTokens);
    // Check after the session guard so a missing or rejected session retains its own denial.
    if (isAiEgressDenied()) {
      await session?.finish(null, false).catch(() => undefined);
      throw new AiExecutionError("service_unavailable", 503);
    }
    return { reservation: result.reservation, release, session };
  } catch (error) {
    await release?.().catch(() => undefined);
    if (error instanceof AiExecutionError) throw error;
    throw new AiExecutionError("service_unavailable", 503);
  }
}

async function settle(reservation: Awaited<ReturnType<typeof reserve>>["reservation"], usage: AiTokenUsage | null) {
  // Missing/malformed usage and ambiguous failures retain the full reservation. Never refund a guess.
  if (!usage) return false;
  try { await reservation.settle(usage); return true; }
  catch { logOperationalWarning("ai-budget", "settlement-retained"); return false; }
}

export async function runMeteredAiCall<T>(input: Call<T>): Promise<T> {
  const gate = await reserve(input);
  try {
    const result = await input.call();
    const usage = input.usage(result);
    const dailySettled = await settle(gate.reservation, usage);
    await gate.session?.finish(usage, dailySettled);
    return result;
  } catch (error) {
    await gate.session?.finish(null, false).catch(() => undefined);
    if (error instanceof AiExecutionError) throw error;
    throw new AiExecutionError("provider_unavailable", 502);
  } finally { await gate.release?.().catch(() => undefined); }
}

/** The lease covers stream consumption; incomplete/cancelled streams keep their full reservation. */
export async function runMeteredAiStream<T>(input: Omit<Call<AsyncIterable<T>>, "usage"> & { usage: (chunk: T) => AiTokenUsage | null }): Promise<AsyncIterable<T>> {
  const gate = await reserve(input);
  let stream: AsyncIterable<T>;
  try { stream = await input.call(); }
  catch { await gate.session?.finish(null, false).catch(() => undefined); await gate.release?.().catch(() => undefined); throw new AiExecutionError("provider_unavailable", 502); }
  return (async function* () {
    let measured: AiTokenUsage | null = null;
    let completed = false;
    try {
      for await (const chunk of stream) { measured = input.usage(chunk); yield chunk; }
      completed = true;
    } finally {
      try {
        const dailySettled = completed ? await settle(gate.reservation, measured) : false;
        await gate.session?.finish(completed ? measured : null, dailySettled);
      } finally { await gate.release?.().catch(() => undefined); }
    }
  })();
}
