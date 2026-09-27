import { createHash } from "node:crypto";
import { createAssistantRlsClient, getAssistantRequestIdentity } from "@/lib/assistant/chatIdentity";
import { createConfiguredAssistantRateLimiter } from "@/lib/assistant/rateLimiter";
import { createConfiguredAiBudget, estimateInputTokens } from "@/lib/assistant/aiBudget";
import { readBoundedJson } from "@/lib/server/readBoundedJson";
import { logOperationalError, logOperationalWarning } from "@/lib/observability/safeLogger";
import { buildHappyAgentContext } from "@/lib/happy/agent-context/buildHappyAgentContext.server";
import { selectHappyAgentContextForIntent } from "@/lib/happy/agent-context/selectHappyAgentContextForIntent";
import { createOpenAiHappyAgentProvider } from "@/lib/happy/agent/happyAgentProvider.server";
import { createHappyAgentResponse } from "@/lib/happy/agent/happyAgentServer";
import { happyAgentRequestSchema } from "@/lib/happy/agent/happyAgent.schema";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200, extra?: HeadersInit) => Response.json(body, { status, headers: { ...headers, ...extra } });
const validTimezone = (timezone: string) => { try { Intl.DateTimeFormat("en", { timeZone: timezone }); return true; } catch { return false; } };

export async function POST(request: Request) {
  const bounded = await readBoundedJson(request, 8 * 1024);
  if (!bounded.ok) return json({ error: bounded.error }, bounded.status);
  const parsed = happyAgentRequestSchema.safeParse(bounded.value);
  if (!parsed.success || !validTimezone(parsed.success ? parsed.data.timezone : "")) return json({ error: "invalid_request" }, 400);
  const body = parsed.data;
  const identity = await getAssistantRequestIdentity(request);
  if (identity.kind !== "authenticated" || !identity.userId) return json({ error: "unauthorized" }, 401);
  const rls = createAssistantRlsClient(request);
  if (!rls) return json({ error: "unauthorized" }, 401);
  const limiter = createConfiguredAssistantRateLimiter();
  if (!limiter) return json({ error: "service_unavailable" }, 503);
  const rateKey = createHash("sha256").update(`happy-agent:${identity.userId}`).digest("hex");
  try {
    const limit = await limiter.check(rateKey, "authenticated");
    if (!limit.allowed) return json({ error: "rate_limited" }, 429, { "Retry-After": String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1_000))) });
    const base = await buildHappyAgentContext({ client: rls.client, userId: identity.userId, locale: body.locale, timezone: body.timezone, personId: body.personId, eventId: body.eventId, taskId: body.taskId });
    if (base.kind === "not_found") return json({ error: "not_found" }, 404);
    if (base.kind !== "ok") return json({ error: "service_unavailable" }, 503);
    const selected = selectHappyAgentContextForIntent(base.context, body.intent);
    if (selected.kind !== "ok") return json({ error: "invalid_request" }, 400);
    const budget = createConfiguredAiBudget();
    if (!budget) return json({ error: "service_unavailable" }, 503);
    const reservation = await budget.reserve(estimateInputTokens([{ content: JSON.stringify(selected.context) }, { content: body.message ?? "" }]), 700);
    if (!reservation.allowed) return json({ error: "daily_ai_budget_exceeded" }, 429, { "Retry-After": String(reservation.retryAfterSeconds) });
    const provider = createOpenAiHappyAgentProvider();
    try {
      const response = await createHappyAgentResponse({ intent: body.intent, context: selected.context, message: body.message, provider, signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]) });
      await reservation.reservation.settle({ inputTokens: 0, outputTokens: 700 }).catch(() => logOperationalWarning("happy-agent", "budget-settlement-skipped"));
      return json(response);
    } catch (error) {
      await reservation.reservation.settle({ inputTokens: 0, outputTokens: 0 }).catch(() => undefined);
      logOperationalError("happy-agent", "provider-failed", error);
      return json({ error: "provider_unavailable" }, 502);
    }
  } catch (error) {
    logOperationalError("happy-agent", "infrastructure-unavailable", error);
    return json({ error: "service_unavailable" }, 503);
  }
}
