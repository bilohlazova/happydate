import OpenAI from "openai";
import { ASSISTANT_CHAT_CONFIG } from "@/lib/assistant/chatConfig";
import { getAssistantEnvironmentStatus } from "@/lib/assistant/chatEnvironment";
import { parseAssistantChatRequest } from "@/lib/assistant/chatContract";
import { createAssistantRlsClient, getAssistantRequestIdentity } from "@/lib/assistant/chatIdentity";
import { createConfiguredAssistantRateLimiter } from "@/lib/assistant/rateLimiter";
import { createAssistantChatResponse, type AssistantProviderMessage } from "@/lib/assistant/chatServer";
import { loadAssistantGiftOutcomeContext } from "@/lib/assistant/giftOutcomeContext.server";
import { loadAssistantSavedGiftLinkContext } from "@/lib/assistant/savedGiftLinkContext.server";
import { loadAssistantPetContext } from "@/lib/assistant/petContext.server";
import { readBoundedJson } from "@/lib/server/readBoundedJson";
import { logOperationalError, logOperationalWarning } from "@/lib/observability/safeLogger";
import { getHomeRepositoryData } from "@/lib/repositories/home/home.repository";
import { buildGuestAssistantRequest, buildVerifiedAssistantRequest } from "@/lib/assistant/verifiedAssistantContext.server";
import { createConfiguredAiBudget, type AiTokenUsage } from "@/lib/assistant/aiBudget";
import { loadAssistantPersonSymbol } from "@/lib/assistant/personSymbolContext.server";
import { buildPersonMemoryProfile, formatPersonMemoryProfileForAssistant } from "@/lib/memory-engine";
import { loadPersonHappyConversationHistory, savePersonHappyConversation } from "@/lib/assistant/happyConversationHistory.server";
import { ChatScopeNotFoundError, resolveVerifiedChatScope } from "@/lib/assistant/chatScope";
import { getActiveTaskDecisions } from "@/lib/happy/taskDecisions.server";
import { createMemoryProposalFromCandidate } from "@/lib/happy/actions/memoryProposal.server";

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
  if (parsed.data.scope.type !== "global" && (identity.kind !== "authenticated" || !identity.userId)) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  let verifiedScope: Awaited<ReturnType<typeof resolveVerifiedChatScope>> | null = null;
  let verifiedContextReady = false;
  if (identity.kind === "authenticated" && identity.userId) {
    try {
      const rlsSession = createAssistantRlsClient(request);
      if (!rlsSession) return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
      verifiedScope = await resolveVerifiedChatScope({ client: rlsSession.client, userId: identity.userId, scope: parsed.data.scope });
    } catch (error) {
      if (error instanceof ChatScopeNotFoundError) return Response.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
      logOperationalWarning("assistant-chat", "scope-resolution-failed", { category: error instanceof Error ? error.name : "unknown" });
      return Response.json({ error: "service_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  }
  const rateLimiter = createConfiguredAssistantRateLimiter();
  const budget = createConfiguredAiBudget();
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  return createAssistantChatResponse(
    body,
    async (messages: AssistantProviderMessage[], signal?: AbortSignal) => {
      if (!apiKey) throw Object.assign(new Error("OpenAI is not configured"), { code: "missing_api_key" });
      const openai = new OpenAI({ apiKey });
      const proposalToolEnabled = verifiedContextReady && verifiedScope?.type !== "global" && Boolean(verifiedScope?.personId);
      const stream = await openai.chat.completions.create(
        {
          model: ASSISTANT_CHAT_CONFIG.model,
          temperature: ASSISTANT_CHAT_CONFIG.temperature,
          max_completion_tokens: ASSISTANT_CHAT_CONFIG.maxOutputTokens,
          stream: true,
          stream_options: { include_usage: true },
          messages,
          ...(proposalToolEnabled ? {
            tools: [{
              type: "function" as const,
              function: {
                name: "propose_memory",
                description: "Propose one stable person fact explicitly stated by the user for approval. Never use this for task-local decisions, uncertainty, assistant text, or inferred facts.",
                strict: true,
                parameters: {
                  type: "object",
                  properties: {
                    kind: { type: "string", enum: ["general_person_knowledge", "task_local", "uncertain", "do_not_remember"] },
                    content: { type: "string", minLength: 1, maxLength: 2_000 },
                  },
                  required: ["kind", "content"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: "auto" as const,
          } : {}),
        },
        { signal },
      );

      let resolveUsage: (usage: AiTokenUsage | null) => void = () => undefined;
      let resolveMemoryProposal: (proposal: unknown) => void = () => undefined;
      const usage = new Promise<AiTokenUsage | null>((resolve) => { resolveUsage = resolve; });
      const memoryProposal = new Promise<unknown>((resolve) => { resolveMemoryProposal = resolve; });
      return {
        usage,
        memoryProposal: proposalToolEnabled ? memoryProposal : undefined,
        stream: (async function* () {
          let measured: AiTokenUsage | null = null;
          const toolArguments = new Map<number, { name: string; arguments: string }>();
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
              for (const toolCall of chunk.choices[0]?.delta?.tool_calls ?? []) {
                const current = toolArguments.get(toolCall.index) ?? { name: "", arguments: "" };
                current.name += toolCall.function?.name ?? "";
                current.arguments += toolCall.function?.arguments ?? "";
                toolArguments.set(toolCall.index, current);
              }
            }
          } finally {
            resolveUsage(measured);
            let proposal: unknown;
            const first = [...toolArguments.values()].find((call) => call.name === "propose_memory");
            if (first) {
              try { proposal = JSON.parse(first.arguments); } catch { proposal = undefined; }
            }
            resolveMemoryProposal(proposal);
          }
        })(),
      };
    },
    {
      signal: request.signal,
      identity,
      rateLimiter,
      budget,
      onCompleted: async (preparedRequest, responseText, memoryProposal) => {
        if (identity.kind !== "authenticated" || !identity.userId) return;
        if (verifiedContextReady && verifiedScope) {
          // Structured proposals are supplied by a trusted provider/tool
          // boundary only; the browser request and assistant text are never
          // interpreted as commands here.
          if (memoryProposal !== undefined) {
            await createMemoryProposalFromCandidate({
              userId: identity.userId,
              scope: verifiedScope,
              currentUserMessage: preparedRequest.message,
              candidate: memoryProposal,
            }).catch(() => undefined);
          }
        }
        const active = preparedRequest.context.personResolutionStatus === "resolved" ? preparedRequest.context.activePerson : null;
        if (!active) return;
        if (responseText.trim()) {
          await savePersonHappyConversation({ userId: identity.userId, personId: active.id, userMessage: preparedRequest.message, happyResponse: responseText });
        }
      },
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
            { includeGiftHistory: true },
          );
          const taskDecisions = verifiedScope?.type === "task"
            ? await getActiveTaskDecisions(rlsSession.client, { userId: identity.userId, taskId: verifiedScope.taskId })
            : null;
          if (verifiedScope?.type === "task" && !taskDecisions) throw new Error("task decisions unavailable");
          const verifiedRequest = buildVerifiedAssistantRequest(clientRequest, homeData, verifiedScope ?? { type: "global", userId: "guest" }, taskDecisions);
          verifiedContextReady = true;
          const [serverGiftOutcomes, serverSavedGiftLinks, serverPets, serverSymbol, serverHappyConversations] = verifiedRequest.context.activePerson
            && verifiedRequest.context.personResolutionStatus === "resolved"
              ? await Promise.all([
                  loadAssistantGiftOutcomeContext({ userId: identity.userId, personId: verifiedRequest.context.activePerson.id }),
                  loadAssistantSavedGiftLinkContext({ userId: identity.userId, personId: verifiedRequest.context.activePerson.id }),
                  loadAssistantPetContext({ userId: identity.userId, personId: verifiedRequest.context.activePerson.id }),
                  loadAssistantPersonSymbol({ userId: identity.userId, personId: verifiedRequest.context.activePerson.id }),
                  loadPersonHappyConversationHistory({ userId: identity.userId, personId: verifiedRequest.context.activePerson.id }),
                ])
              : [[], [], [], null, []];
          const active = verifiedRequest.context.activePerson;
          const homePerson = active ? homeData.people.find((person) => person.id === active.id) : null;
          const serverPersonMemoryProfile = active && homePerson ? formatPersonMemoryProfileForAssistant(buildPersonMemoryProfile({
            personId: active.id,
            personName: active.name,
            relationLabel: active.relation,
            birthday: active.birthday,
            knowledge: homeData.knowledge,
            symbol: serverSymbol,
            pets: serverPets,
            happyConversations: serverHappyConversations,
            locale: verifiedRequest.locale === "uk" ? "uk" : "en",
          })) : null;
          return { request: verifiedRequest, serverGiftOutcomes, serverSavedGiftLinks, serverPets, serverPersonMemoryProfile };
        } catch (error) {
          verifiedContextReady = false;
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
