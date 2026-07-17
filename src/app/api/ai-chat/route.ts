import OpenAI from "openai";
import { ASSISTANT_CHAT_CONFIG } from "@/lib/assistant/chatConfig";
import { getAssistantRequestIdentity } from "@/lib/assistant/chatIdentity";
import { createConfiguredAssistantRateLimiter } from "@/lib/assistant/rateLimiter";
import { createAssistantChatResponse, type AssistantProviderMessage } from "@/lib/assistant/chatServer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const identity = await getAssistantRequestIdentity(request);
  const rateLimiter = createConfiguredAssistantRateLimiter();
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
          messages,
        },
        { signal },
      );

      return (async function* () {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) yield content;
        }
      })();
    },
    { signal: request.signal, identity, rateLimiter },
  );
}
