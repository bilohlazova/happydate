import OpenAI from "openai";
import { ASSISTANT_CHAT_CONFIG } from "@/lib/assistant/chatConfig";
import { getAssistantEnvironmentStatus } from "@/lib/assistant/chatEnvironment";
import { parseAssistantChatRequest } from "@/lib/assistant/chatContract";
import { createAssistantRlsClient, getAssistantRequestIdentity } from "@/lib/assistant/chatIdentity";
import { createConfiguredAssistantRateLimiter } from "@/lib/assistant/rateLimiter";
import { createAssistantChatResponse, type AssistantProviderMessage } from "@/lib/assistant/chatServer";
import { loadAssistantGiftOutcomeContext } from "@/lib/assistant/giftOutcomeContext.server";
import { loadAssistantSavedGiftLinkContext } from "@/lib/assistant/savedGiftLinkContext.server";
import { readBoundedJson } from "@/lib/server/readBoundedJson";
import { logOperationalError, logOperationalWarning } from "@/lib/observability/safeLogger";
import { getHomeRepositoryData } from "@/lib/repositories/home/home.repository";
import { buildGuestAssistantRequest, buildVerifiedAssistantRequest } from "@/lib/assistant/verifiedAssistantContext.server";
import { createConfiguredAiBudget, type AiTokenUsage } from "@/lib/assistant/aiBudget";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsedBody = await readBoundedJson(request, 64 * 1024);
  if (!parsedBody.ok) {
    return Response.json(
      { error: parsedBody.error },
      { status: parsedBody.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  const body = parsedBody.value;

  const parsed = parseAssistantChatRequest(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const environmentStatus = getAssistantEnvironmentStatus();
  if (process.env.NODE_ENV === "production" && !environmentStatus.productionReady) {
    logOperationalError("assistant-chat", "configuration-missing");
    return Response.json(
      { error: "service_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const identity = await getAssistantRequestIdentity(request);
  const rateLimiter = createConfiguredAssistantRateLimiter();
  const budget = createConfiguredAiBudget();
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  return createAssistantChatResponse(
    body,
    async (messages: AssistantProviderMessage[], signal?: AbortSignal) => {
      if (!apiKey) throw Object.assign(new Error("OpenAI is not configured"), { code: "missing_api_key" });
      const openai = new OpenAI({ apiKey });
      const stream = await openai.chat.completions.create(
        {
          model: ASSISTANT_CHAT_CONFIG.model,
          temperature: ASSISTANT_CHAT_CONFIG.temperature,
          max_completion_tokens: ASSISTANT_CHAT_CONFIG.maxOutputTokens,
          stream: true,
          stream_options: { include_usage: true },
          messages,
        },
        { signal },
      );

      let resolveUsage: (usage: AiTokenUsage | null) => void = () => undefined;
      const usage = new Promise<AiTokenUsage | null>((resolve) => { resolveUsage = resolve; });
      return {
        usage,
        stream: (async function* () {
          let measured: AiTokenUsage | null = null;
          try {
            for await (const chunk of stream) {
              if (chunk.usage) {
                measured = {
                  inputTokens: chunk.usage.prompt_tokens,
                  outputTokens: chunk.usage.completion_tokens,
                };
              }
              const content = chunk.choices[0]?.delta?.content;
              if (content) yield content;
            }
          } finally {
            resolveUsage(measured);
          }
        })(),
      };
    },
    {
      signal: request.signal,
      identity,
      rateLimiter,
      budget,
      prepareRequest: async (clientRequest) => {
        if (identity.kind !== "authenticated" || !identity.userId) {
          return { request: buildGuestAssistantRequest(clientRequest) };
        }
        try {
          const rlsSession = createAssistantRlsClient(request);
          if (!rlsSession) throw new Error("RLS client unavailable");
          const homeData = await getHomeRepositoryData(
            rlsSession.client,
            identity.userId,
            rlsSession.accessToken,
          );
          const verifiedRequest = buildVerifiedAssistantRequest(clientRequest, homeData);
          const [serverGiftOutcomes, serverSavedGiftLinks] = verifiedRequest.context.activePerson
            && verifiedRequest.context.personResolutionStatus === "resolved"
              ? await Promise.all([
                  loadAssistantGiftOutcomeContext({ userId: identity.userId, personId: verifiedRequest.context.activePerson.id }),
                  loadAssistantSavedGiftLinkContext({ userId: identity.userId, personId: verifiedRequest.context.activePerson.id }),
                ])
              : [[], []];
          return { request: verifiedRequest, serverGiftOutcomes, serverSavedGiftLinks };
        } catch (error) {
          // A temporary context failure must never make the conversation unavailable.
          logOperationalWarning("assistant-chat", "verified-context-fallback", {
            reason: error instanceof Error ? error.name : "unknown",
          });
          return { request: buildGuestAssistantRequest(clientRequest) };
        }
      },
    },
  );
}
