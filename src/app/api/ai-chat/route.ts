import { logHostedAiAttestation, readHostedSessionConfig } from "@/lib/assistant/hostedTestSession.server";
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
import { type AiTokenUsage } from "@/lib/assistant/aiBudget";
import { withAiExecutionScope, runMeteredAiStream, parseOpenAiUsage } from "@/lib/assistant/aiExecution.server";
import type { ChatCompletionCreateParamsStreaming } from "openai/resources/chat/completions";
import { loadAssistantPersonSymbol } from "@/lib/assistant/personSymbolContext.server";
import { loadPersonHappyConversationHistory, savePersonHappyConversation } from "@/lib/assistant/happyConversationHistory.server";
import { listShownGiftIdeas } from "@/lib/gift-intelligence/shownGiftIdeas.server";
import { formatShownIdeasContext } from "@/lib/gift-intelligence/shownGiftIdeas";
import { loadConversationMemoryContext, saveChatTurn, summarizeConversationsIfDue } from "@/lib/assistant/conversationMemory.server";
import { queueKnowledgeCandidate } from "@/lib/happy/learning/knowledgeQueue.server";
import { memoryProposalCandidateSchema } from "@/lib/happy/actions/memoryProposal.server";
import { after } from "next/server";
import { SUGGEST_GIFTS_TOOL, SUGGEST_GIFTS_TOOL_NAME, parseSuggestGiftsArgs, runSuggestGiftsTool } from "@/lib/assistant/giftTool.server";
import { DEFAULT_LOCALE, normalizeLocale } from "@/i18n/config";
import { buildUnifiedPersonContext } from "@/lib/person-context";
import { ChatScopeNotFoundError, resolveVerifiedChatScope } from "@/lib/assistant/chatScope";
import { getActiveTaskDecisions } from "@/lib/happy/taskDecisions.server";

export const runtime = "nodejs";
// Explicit so the limit is validated by the Vercel build, not inferred from plan defaults.
// Longest chain (chat round + gifts + search + chat round) stays well under it; every single
// provider call is aborted at <= 60 s, which is below the 75 s concurrency lease.
export const maxDuration = 300;

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
    logHostedAiAttestation(body);
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
  // Server-verified recipient for the gift tool; set only after context is verified.
  let toolPersonId: string | null = null;
  let toolLocale: string = parsed.data.locale;
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
  // Chat has a route-level limiter before the shared provider boundary.
  try {
    readHostedSessionConfig();
  } catch {
    return Response.json({ error: "service_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const rateLimiter = createConfiguredAssistantRateLimiter();
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  return createAssistantChatResponse(
    body,
    async (messages: AssistantProviderMessage[], signal?: AbortSignal) => {
      if (!apiKey) throw Object.assign(new Error("OpenAI is not configured"), { code: "missing_api_key" });
      const proposalToolEnabled = verifiedContextReady && verifiedScope?.type !== "global" && Boolean(verifiedScope?.personId);
      const giftToolEnabled = verifiedContextReady && Boolean(toolPersonId) && identity.kind === "authenticated" && Boolean(identity.userId);
      const tools = [
        ...(proposalToolEnabled ? [{
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
        }] : []),
        ...(giftToolEnabled ? [SUGGEST_GIFTS_TOOL] : []),
      ];
      const params: ChatCompletionCreateParamsStreaming = {
          model: ASSISTANT_CHAT_CONFIG.model,
          temperature: ASSISTANT_CHAT_CONFIG.temperature,
          max_completion_tokens: ASSISTANT_CHAT_CONFIG.maxOutputTokens,
          stream: true,
          stream_options: { include_usage: true },
          messages,
          ...(tools.length ? { tools, tool_choice: "auto" as const } : {}),
      };
      // Every model round is its own metered call (SEC-01): rate limit,
      // concurrency lease, daily budget and hosted-session accounting.
      const meteredRound = (roundParams: ChatCompletionCreateParamsStreaming) => withAiExecutionScope(identity, () => runMeteredAiStream({
        feature: "chat", model: roundParams.model, payload: roundParams, maxOutputTokens: ASSISTANT_CHAT_CONFIG.maxOutputTokens,
        call: () => new OpenAI({ apiKey, maxRetries: 0 }).chat.completions.create(roundParams, { signal }),
        usage: chunk => parseOpenAiUsage(chunk.usage, "chat"),
      }));
      const stream = await meteredRound(params);

      let resolveUsage: (usage: AiTokenUsage | null) => void = () => undefined;
      let resolveMemoryProposal: (proposal: unknown) => void = () => undefined;
      const usage = new Promise<AiTokenUsage | null>((resolve) => { resolveUsage = resolve; });
      const memoryProposal = new Promise<unknown>((resolve) => { resolveMemoryProposal = resolve; });
      return {
        usage,
        memoryProposal: proposalToolEnabled ? memoryProposal : undefined,
        stream: (async function* () {
          let measured: AiTokenUsage | null = null;
          const addUsage = (next: AiTokenUsage) => {
            measured = {
              inputTokens: (measured?.inputTokens ?? 0) + next.inputTokens,
              outputTokens: (measured?.outputTokens ?? 0) + next.outputTokens,
            };
          };
          const toolArguments = new Map<number, { id: string; name: string; arguments: string }>();
          try {
            let roundUsage: AiTokenUsage | null = null;
            for await (const chunk of stream) {
              if (chunk.usage) {
                roundUsage = {
                  inputTokens: chunk.usage.prompt_tokens,
                  outputTokens: chunk.usage.completion_tokens,
                };
              }
              const content = chunk.choices[0]?.delta?.content;
              if (content) yield content;
              for (const toolCall of chunk.choices[0]?.delta?.tool_calls ?? []) {
                const current = toolArguments.get(toolCall.index) ?? { id: "", name: "", arguments: "" };
                current.id += toolCall.id ?? "";
                current.name += toolCall.function?.name ?? "";
                current.arguments += toolCall.function?.arguments ?? "";
                toolArguments.set(toolCall.index, current);
              }
            }
            if (roundUsage) addUsage(roundUsage);

            // Second round: the model asked for gift ideas. The shared Gift
            // Intelligence pipeline runs for the server-verified person (its own
            // provider calls are metered separately), then the model presents
            // the result in its own words through one more metered round.
            const calls = [...toolArguments.values()];
            const giftCall = giftToolEnabled ? calls.find((call) => call.name === SUGGEST_GIFTS_TOOL_NAME) : undefined;
            if (giftCall && toolPersonId && identity.userId) {
              const giftResult = await runSuggestGiftsTool({
                userId: identity.userId,
                personId: toolPersonId,
                locale: normalizeLocale(toolLocale) ?? DEFAULT_LOCALE,
                args: parseSuggestGiftsArgs(giftCall.arguments),
                eventId: verifiedScope?.type === "event" || verifiedScope?.type === "task" ? verifiedScope.eventId : null,
                signal,
              });
              const followUpParams: ChatCompletionCreateParamsStreaming = {
                model: ASSISTANT_CHAT_CONFIG.model,
                temperature: ASSISTANT_CHAT_CONFIG.temperature,
                max_completion_tokens: ASSISTANT_CHAT_CONFIG.maxOutputTokens,
                stream: true,
                stream_options: { include_usage: true },
                messages: [
                  ...messages,
                  {
                    role: "assistant",
                    content: null,
                    tool_calls: calls.map((call) => ({
                      id: call.id,
                      type: "function" as const,
                      function: { name: call.name, arguments: call.arguments || "{}" },
                    })),
                  },
                  ...calls.map((call) => ({
                    role: "tool" as const,
                    tool_call_id: call.id,
                    content: call === giftCall ? giftResult : JSON.stringify({ status: "received" }),
                  })),
                ],
              };
              const followUp = await meteredRound(followUpParams);
              let followUpUsage: AiTokenUsage | null = null;
              for await (const chunk of followUp) {
                if (chunk.usage) {
                  followUpUsage = { inputTokens: chunk.usage.prompt_tokens, outputTokens: chunk.usage.completion_tokens };
                }
                const content = chunk.choices[0]?.delta?.content;
                if (content) yield content;
              }
              if (followUpUsage) addUsage(followUpUsage);
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
      onCompleted: async (preparedRequest, responseText, memoryProposal) => {
        if (identity.kind !== "authenticated" || !identity.userId) return;
        const userId = identity.userId;
        const active = preparedRequest.context.personResolutionStatus === "resolved" ? preparedRequest.context.activePerson : null;
        // Person this exchange is about: a verified scope wins, otherwise the
        // server-resolved active person. Never a model or browser value.
        const scopedPersonId = verifiedScope && verifiedScope.type !== "global" ? verifiedScope.personId : null;
        const turnPersonId = scopedPersonId ?? active?.id ?? null;
        if (verifiedContextReady && verifiedScope && memoryProposal !== undefined && turnPersonId) {
          // Structured proposals are supplied by a trusted provider/tool
          // boundary only; the browser request and assistant text are never
          // interpreted as commands here. They enter the single knowledge queue.
          const candidate = memoryProposalCandidateSchema.safeParse(memoryProposal);
          if (candidate.success) {
            await queueKnowledgeCandidate({
              userId,
              personId: turnPersonId,
              taskId: verifiedScope.type === "task" ? verifiedScope.taskId : null,
              kind: candidate.data.kind,
              content: candidate.data.content,
              sourceText: preparedRequest.message,
              source: "chat_tool",
            }).catch(() => undefined);
          }
        }
        if (verifiedContextReady && responseText.trim()) {
          await saveChatTurn({
            userId,
            personId: turnPersonId,
            scope: verifiedScope?.type ?? "global",
            userMessage: preparedRequest.message,
            happyResponse: responseText,
          }).catch(() => undefined);
          // Rolling summaries run after the reply so they never delay the user.
          // They are metered under their own feature inside the SEC-01 boundary.
          try { after(() => summarizeConversationsIfDue({ userId })); }
          catch { void summarizeConversationsIfDue({ userId }); }
        }
        if (!active) return;
        if (responseText.trim()) {
          await savePersonHappyConversation({ userId, personId: active.id, userMessage: preparedRequest.message, happyResponse: responseText });
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
          toolPersonId = verifiedRequest.context.personResolutionStatus === "resolved" ? verifiedRequest.context.activePerson?.id ?? null : null;
          toolLocale = verifiedRequest.locale;
          const [serverGiftOutcomes, serverSavedGiftLinks, serverPets, serverSymbol, serverHappyConversations, serverShownGiftIdeas] = verifiedRequest.context.activePerson
            && verifiedRequest.context.personResolutionStatus === "resolved"
              ? await Promise.all([
                  loadAssistantGiftOutcomeContext({ userId: identity.userId, personId: verifiedRequest.context.activePerson.id }),
                  loadAssistantSavedGiftLinkContext({ userId: identity.userId, personId: verifiedRequest.context.activePerson.id }),
                  loadAssistantPetContext({ userId: identity.userId, personId: verifiedRequest.context.activePerson.id }),
                  loadAssistantPersonSymbol({ userId: identity.userId, personId: verifiedRequest.context.activePerson.id }),
                  loadPersonHappyConversationHistory({ userId: identity.userId, personId: verifiedRequest.context.activePerson.id }),
                  listShownGiftIdeas({ userId: identity.userId, personId: verifiedRequest.context.activePerson.id }),
                ])
              : [[], [], [], null, [], []];
          const active = verifiedRequest.context.activePerson;
          const homePerson = active ? homeData.people.find((person) => person.id === active.id) : null;
          const serverPersonMemoryProfile = active && homePerson ? buildUnifiedPersonContext({
            personId: active.id,
            personName: active.name,
            relationLabel: active.relation,
            birthday: active.birthday,
            knowledge: homeData.knowledge,
            symbol: serverSymbol,
            pets: serverPets,
            happyConversations: serverHappyConversations,
            locale: verifiedRequest.locale === "uk" ? "uk" : "en",
          }).forChat : null;
          const memoryScope = verifiedScope?.type ?? "global";
          const memoryPersonId = verifiedScope && verifiedScope.type !== "global" ? verifiedScope.personId : (active?.id ?? null);
          const serverConversationMemory = await loadConversationMemoryContext({
            userId: identity.userId,
            scope: memoryScope,
            personId: memoryPersonId,
            conversation: verifiedRequest.conversation,
            includeRecentTurns: !active,
          });
          return {
            request: verifiedRequest,
            serverGiftOutcomes,
            serverSavedGiftLinks,
            serverPets,
            serverPersonMemoryProfile,
            serverShownGiftIdeasContext: formatShownIdeasContext(serverShownGiftIdeas),
            serverConversationMemory,
          };
        } catch (error) {
          verifiedContextReady = false;
          toolPersonId = null;
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
