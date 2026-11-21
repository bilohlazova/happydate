import "server-only";
import OpenAI from "openai";
import { runMeteredAiCall, parseOpenAiUsage } from "../../assistant/aiExecution.server.ts";
import { ASSISTANT_CHAT_CONFIG } from "../../assistant/chatConfig.ts";
import { buildHappyAgentPrompt } from "./happyAgentPrompt.ts";
import type { HappyAgentProvider, HappyAgentProviderInput } from "./happyAgent.types";

function schemaFor(input: HappyAgentProviderInput) {
  if (input.intent === "write_greeting") return { name: "happy_write_greeting", strict: true, schema: { type: "object", additionalProperties: false, required: ["message"], properties: { message: { type: "string", maxLength: 1500 } } } };
  const knowledge = Object.values(input.context.knowledge ?? {}).flatMap(items => items ?? []);
  const groups = [
    { type: "knowledge", items: knowledge },
    { type: "memory", items: input.context.memories ?? [] },
    { type: "gift", items: input.context.gifts?.previous ?? [] },
  ];
  // Only the references in this server-selected context may be generated.
  // The domain boundary still resolves each type/ID pair before building UI.
  const references = groups.filter(group => group.items.length > 0).map(group => ({
    type: "object", additionalProperties: false, required: ["type", "id"],
    properties: {
      type: { type: "string", enum: [group.type] },
      id: { type: "string", enum: [...new Set(group.items.map(item => item.id))] },
    },
  }));
  return {
    name: "happy_birthday_gift", strict: true,
    schema: {
      type: "object", additionalProperties: false, required: ["message", "idea"],
      properties: {
        message: { type: ["string", "null"], maxLength: 1500 },
        idea: references.length === 0 ? { type: "null" } : {
          type: ["object", "null"], additionalProperties: false, required: ["title", "message", "reasonSources"],
          properties: {
            title: { type: "string", maxLength: 300 },
            message: { type: "string", maxLength: 1500 },
            reasonSources: { type: "array", minItems: 1, maxItems: 3, items: { anyOf: references } },
          },
        },
      },
    },
  };
}

function normalizeBirthdayOutput(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const result = { ...value } as Record<string, unknown>;
  if (result.message === null) delete result.message;
  if (result.idea === null) delete result.idea;
  return result;
}

export function createOpenAiHappyAgentProvider(apiKey = process.env.OPENAI_API_KEY?.trim()): HappyAgentProvider {
  return async (input) => {
    if (!apiKey) throw Object.assign(new Error("provider unavailable"), { code: "missing_api_key" });
    const prompt = buildHappyAgentPrompt(input);
    const instructions = input.intent === "birthday_gift" ? `${prompt.instructions} Cite an idea with reasonSources from the supplied context only. Use null for an absent message or idea. If no source supports an idea, return a message with idea null.` : prompt.instructions;
    const params = { model: ASSISTANT_CHAT_CONFIG.model, temperature: 0.2, max_output_tokens: 700, store: false, instructions, input: prompt.input, text: { format: { type: "json_schema" as const, ...schemaFor(input) } } };
    const response = await runMeteredAiCall({ feature: "happy-agent", model: params.model, payload: params, maxOutputTokens: params.max_output_tokens,
      call: () => new OpenAI({ apiKey, maxRetries: 0 }).responses.create(params, { signal: input.signal ?? AbortSignal.timeout(30_000) }),
      usage: value => parseOpenAiUsage(value.usage, "responses"),
    });
    if (!response.output_text) throw Object.assign(new Error("empty provider output"), { code: "invalid_provider_output" });
    try {
      const value: unknown = JSON.parse(response.output_text);
      return input.intent === "birthday_gift" ? normalizeBirthdayOutput(value) : value;
    } catch { throw Object.assign(new Error("invalid provider output"), { code: "invalid_provider_output" }); }
  };
}
