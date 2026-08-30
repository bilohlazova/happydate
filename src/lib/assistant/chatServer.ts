import { ASSISTANT_CHAT_CONFIG, type AssistantIdentityKind } from "./chatConfig.ts";
import type { AssistantChatRequest, AssistantConversationItem } from "./chatContract.ts";
import { buildAssistantSystemPrompt, formatAssistantContext, parseAssistantChatRequest } from "./chatContract.ts";
import type { AssistantRateLimiter } from "./rateLimiter.ts";
import { logAiUsageEvent, logOperationalError, logOperationalWarning } from "../observability/safeLogger.ts";
import type { AssistantGiftOutcomeContext } from "./giftOutcomeContext.server.ts";
import { formatAssistantGiftOutcomeContext } from "./chatContract.ts";
import type { AssistantSavedGiftLinkContext } from "./savedGiftLinkContext.server.ts";
import { formatAssistantSavedGiftLinkContext } from "./chatContract.ts";
import { ASSISTANT_BEHAVIOR_MANIFEST } from "./assistantBehaviorManifest.ts";
import { AI_COST_POLICY, estimateInputTokens, estimatedUsd, type AiBudget, type AiBudgetReservation, type AiTokenUsage } from "./aiBudget.ts";
import { buildAssistantResponsePlan } from "./responsePlan.ts";
import { wellbeingMode } from "./wellbeingConversation.ts";

export type AssistantProviderMessage = AssistantConversationItem | { role: "system"; content: string };
export type AssistantProviderOutput = {
  stream: AsyncIterable<string>;
  usage?: Promise<AiTokenUsage | null>;
};
export type AssistantTextProvider = (
  messages: AssistantProviderMessage[],
  signal?: AbortSignal,
  reservation?: AiBudgetReservation,
) => Promise<AsyncIterable<string> | AssistantProviderOutput>;

export type AssistantProviderErrorCode =
  | "missing_api_key"
  | "authentication_failed"
  | "rate_limited"
  | "provider_unavailable"
  | "timeout"
  | "invalid_provider_response"
  | "unknown";

type SafeProviderDiagnostic = {
  errorType: AssistantProviderErrorCode;
  category:
    | "openai_key_missing"
    | "provider_auth_failed"
    | "provider_rate_limited"
    | "provider_unavailable"
    | "provider_timeout"
    | "invalid_provider_response"
    | "provider_unknown";
  status: number | null;
  requestId: string | null;
};

type ChatResponseOptions = {
  signal?: AbortSignal;
  identity?: { kind: AssistantIdentityKind; key: string };
  rateLimiter?: AssistantRateLimiter | null;
  logger?: (message: string, diagnostic?: unknown) => void;
  timeoutMs?: number;
  serverGiftOutcomes?: readonly AssistantGiftOutcomeContext[];
  serverSavedGiftLinks?: readonly AssistantSavedGiftLinkContext[];
  prepareRequest?: (request: AssistantChatRequest) => Promise<{
    request: AssistantChatRequest;
    serverGiftOutcomes?: readonly AssistantGiftOutcomeContext[];
    serverSavedGiftLinks?: readonly AssistantSavedGiftLinkContext[];
  }>;
  budget?: AiBudget | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function classifyAssistantProviderError(error: unknown, timedOut = false): SafeProviderDiagnostic {
  if (timedOut) return { errorType: "timeout", category: "provider_timeout", status: null, requestId: null };
  const value = isRecord(error) ? error : {};
  const status = typeof value.status === "number" ? value.status : null;
  const code = typeof value.code === "string" ? value.code : "";
  const name = typeof value.name === "string" ? value.name : "";
  const constructorName = isRecord(value.constructor) && typeof value.constructor.name === "string"
    ? value.constructor.name
    : error instanceof Error ? error.constructor.name : "";
  const requestId = typeof value.request_id === "string"
    ? value.request_id
    : typeof value.requestId === "string" ? value.requestId : null;
  let errorType: AssistantProviderErrorCode = "unknown";
  if (code === "missing_api_key") errorType = "missing_api_key";
  else if (status === 401 || code === "invalid_api_key") errorType = "authentication_failed";
  else if (status === 429) errorType = "rate_limited";
  else if (status !== null && status >= 500) errorType = "provider_unavailable";
  else if (constructorName === "APIConnectionError") errorType = "provider_unavailable";
  else if (name === "AbortError") errorType = "timeout";
  else if (status === 400 || status === 422) errorType = "invalid_provider_response";
  let category: SafeProviderDiagnostic["category"] = "provider_unknown";
  if (errorType === "missing_api_key") category = "openai_key_missing";
  else if (errorType === "authentication_failed") category = "provider_auth_failed";
  else if (errorType === "rate_limited") category = "provider_rate_limited";
  else if (errorType === "provider_unavailable") category = "provider_unavailable";
  else if (errorType === "timeout") category = "provider_timeout";
  else if (errorType === "invalid_provider_response") category = "invalid_provider_response";
  return { errorType, category, status, requestId };
}

function providerFailureResponse(diagnostic: SafeProviderDiagnostic): Response {
  const status = diagnostic.errorType === "timeout" ? 504 : 503;
  return Response.json({ error: "provider_unavailable" }, { status });
}

function combinedAbortSignal(clientSignal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromClient = () => controller.abort(clientSignal?.reason);
  if (clientSignal?.aborted) abortFromClient();
  else clientSignal?.addEventListener("abort", abortFromClient, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException("Provider request timed out", "TimeoutError"));
  }, timeoutMs);
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      clientSignal?.removeEventListener("abort", abortFromClient);
    },
  };
}

export async function createAssistantChatResponse(
  rawBody: unknown,
  provider: AssistantTextProvider,
  optionsOrSignal: ChatResponseOptions | AbortSignal = {},
): Promise<Response> {
  const options: ChatResponseOptions = optionsOrSignal instanceof AbortSignal
    ? { signal: optionsOrSignal }
    : optionsOrSignal;
  const logger = options.logger ?? ((message, diagnostic) => logOperationalError("assistant-chat", message, diagnostic));
  const parsed = parseAssistantChatRequest(rawBody);
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });

  let release: (() => Promise<void>) | undefined;
  if (options.identity) {
    if (!options.rateLimiter) {
      logger("configuration missing", { missing: ["upstash_url_missing", "upstash_token_missing"] });
      return Response.json({ error: "service_unavailable" }, { status: 503 });
    }
    try {
      const result = await options.rateLimiter.check(options.identity.key, options.identity.kind);
      if (!result.allowed) {
        const retryAfter = Math.max(1, Math.min(600, Math.ceil((result.resetAt - Date.now()) / 1_000)));
        return Response.json(
          { error: "rate_limited", retryAfter },
          { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
        );
      }
      release = await options.rateLimiter.acquire?.(options.identity.key) ?? undefined;
      if (options.rateLimiter.acquire && !release) {
        return Response.json({ error: "too_many_concurrent_requests" }, { status: 429, headers: { "Retry-After": "5" } });
      }
    } catch {
      logger("infrastructure unavailable", { category: "upstash_unavailable" });
      return Response.json({ error: "service_unavailable" }, { status: 503 });
    }
  }

  let request: AssistantChatRequest = parsed.data;
  let serverGiftOutcomes = options.serverGiftOutcomes ?? [];
  let serverSavedGiftLinks = options.serverSavedGiftLinks ?? [];
  if (options.prepareRequest) {
    try {
      const prepared = await options.prepareRequest(request);
      request = prepared.request;
      serverGiftOutcomes = prepared.serverGiftOutcomes ?? [];
      serverSavedGiftLinks = prepared.serverSavedGiftLinks ?? [];
    } catch {
      await release?.();
      logger("verified context unavailable", { category: "verified_context_unavailable" });
      return Response.json(
        { error: "service_unavailable" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
  }
  const context = formatAssistantContext(request.context);
  const giftOutcomeContext = formatAssistantGiftOutcomeContext(serverGiftOutcomes);
  const savedGiftLinkContext = formatAssistantSavedGiftLinkContext(serverSavedGiftLinks);
  const messages: AssistantProviderMessage[] = [
    { role: "system", content: buildAssistantSystemPrompt(request.locale) },
    { role: "system", content: wellbeingMode(request.message) === "emotional_conversation"
      ? "The user may be sharing something personal. Respond warmly and specifically to their words. Do not automatically redirect to calendar, gifts, or tasks. Ask at most one gentle question when it helps. Do not claim to store their message or act as a therapist."
      : "The user appears ready to move on from a personal exchange. Acknowledge them briefly, then you may naturally summarize verified upcoming events and offer a practical next step." },
    { role: "system", content: buildAssistantResponsePlan(request) },
    ...(context ? [{ role: "system" as const, content: context }] : []),
    ...(giftOutcomeContext ? [{ role: "system" as const, content: giftOutcomeContext }] : []),
    ...(savedGiftLinkContext ? [{ role: "system" as const, content: savedGiftLinkContext }] : []),
    ...request.conversation,
    { role: "user", content: request.message },
  ];
  let budgetReservation: AiBudgetReservation | undefined;
  if (options.budget === null) {
    await release?.();
    logger("configuration missing", { category: "ai_budget_missing" });
    return Response.json({ error: "service_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (options.budget) {
    try {
      const budget = await options.budget.reserve(
        estimateInputTokens(messages),
        ASSISTANT_CHAT_CONFIG.maxOutputTokens,
      );
      if (!budget.allowed) {
        await release?.();
        return Response.json(
          { error: "daily_ai_budget_exceeded", retryAfter: budget.retryAfterSeconds },
          { status: 429, headers: { "Retry-After": String(budget.retryAfterSeconds), "Cache-Control": "no-store" } },
        );
      }
      budgetReservation = budget.reservation;
    } catch {
      await release?.();
      logger("infrastructure unavailable", { category: "ai_budget_unavailable" });
      return Response.json({ error: "service_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  }
  const abort = combinedAbortSignal(options.signal, options.timeoutMs ?? ASSISTANT_CHAT_CONFIG.requestTimeoutMs);

  try {
    const providerOutput = await provider(messages, abort.signal, budgetReservation);
    const output = Symbol.asyncIterator in providerOutput ? providerOutput : providerOutput.stream;
    const usage = Symbol.asyncIterator in providerOutput ? undefined : providerOutput.usage;
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of output) {
            if (abort.signal.aborted) break;
            if (typeof chunk !== "string") throw Object.assign(new Error("invalid provider response"), { status: 422 });
            if (chunk) controller.enqueue(encoder.encode(chunk));
          }
          const actualUsage = await usage;
          if (actualUsage) {
            await budgetReservation?.settle(actualUsage).catch(() => {
              logOperationalWarning("ai-budget", "settlement-skipped", { category: "upstash_unavailable" });
            });
            logAiUsageEvent({
              feature: "assistant",
              ...actualUsage,
              estimatedUsd: estimatedUsd(actualUsage),
              behaviorVersion: ASSISTANT_BEHAVIOR_MANIFEST.behaviorVersion,
              pricingVersion: AI_COST_POLICY.version,
            });
          }
          controller.close();
        } catch (error) {
          if (options.signal?.aborted) controller.close();
          else {
            logger("provider stream failed", classifyAssistantProviderError(error, abort.timedOut()));
            controller.error(new Error("provider stream failed"));
          }
        } finally {
          abort.cleanup();
          await release?.();
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-HappyDate-Assistant-Version": ASSISTANT_BEHAVIOR_MANIFEST.behaviorVersion,
      },
    });
  } catch (error) {
    abort.cleanup();
    await release?.();
    if (options.signal?.aborted) return new Response(null, { status: 499 });
    const diagnostic = classifyAssistantProviderError(error, abort.timedOut());
    logger("provider request failed", diagnostic);
    return providerFailureResponse(diagnostic);
  }
}
