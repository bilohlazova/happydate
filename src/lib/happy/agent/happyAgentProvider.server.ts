import "server-only";
import OpenAI from "openai";
import { ASSISTANT_CHAT_CONFIG } from "../../assistant/chatConfig.ts";
import { buildHappyAgentPrompt } from "./happyAgentPrompt.ts";
import type { HappyAgentProvider } from "./happyAgent.types";

const schemaFor = (intent: "birthday_gift" | "write_greeting") => intent === "birthday_gift"
  ? { name: "happy_birthday_gift", strict: true, schema: { type: "object", additionalProperties: false, required: [], properties: { message: { type: "string", maxLength: 1500 }, idea: { type: "object", additionalProperties: false, required: ["title", "message"], properties: { title: { type: "string", maxLength: 300 }, message: { type: "string", maxLength: 1500 } } } } } }
  : { name: "happy_write_greeting", strict: true, schema: { type: "object", additionalProperties: false, required: ["message"], properties: { message: { type: "string", maxLength: 1500 } } } };

export function createOpenAiHappyAgentProvider(apiKey = process.env.OPENAI_API_KEY?.trim()): HappyAgentProvider {
  return async (input) => {
    if (!apiKey) throw Object.assign(new Error("provider unavailable"), { code: "missing_api_key" });
    const prompt = buildHappyAgentPrompt(input);
    const response = await new OpenAI({ apiKey }).responses.create({ model: ASSISTANT_CHAT_CONFIG.model, temperature: 0.2, max_output_tokens: 700, store: false, instructions: prompt.instructions, input: prompt.input, text: { format: { type: "json_schema", ...schemaFor(input.intent) } } }, { signal: input.signal });
    if (!response.output_text) throw Object.assign(new Error("empty provider output"), { code: "invalid_provider_output" });
    try { return JSON.parse(response.output_text) as unknown; } catch { throw Object.assign(new Error("invalid provider output"), { code: "invalid_provider_output" }); }
  };
}
