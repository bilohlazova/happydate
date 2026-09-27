import type { HappyAgentIntentContext } from "../agent-context/happyAgentIntentContext.types";
import { happyAgentBirthdayModelResultSchema, happyAgentGreetingModelResultSchema } from "./happyAgent.schema.ts";
import type { HappyAgentProvider, HappyAgentResponse } from "./happyAgent.types";

export async function createHappyAgentResponse({ intent, context, message, provider, signal }: { intent: "birthday_gift" | "write_greeting"; context: HappyAgentIntentContext; message?: string; provider: HappyAgentProvider; signal?: AbortSignal }): Promise<HappyAgentResponse> {
  const raw = await provider({ intent, context, userMessage: message, signal });
  if (intent === "birthday_gift") {
    const parsed = happyAgentBirthdayModelResultSchema.safeParse(raw);
    if (!parsed.success) throw Object.assign(new Error("invalid provider output"), { code: "invalid_provider_output" });
    return {
      ...(parsed.data.message ? { message: parsed.data.message } : {}),
      ...(parsed.data.idea ? { proposedIdea: { type: "gift", title: parsed.data.idea.title, message: parsed.data.idea.message } } : {}),
    };
  }
  const parsed = happyAgentGreetingModelResultSchema.safeParse(raw);
  if (!parsed.success) throw Object.assign(new Error("invalid provider output"), { code: "invalid_provider_output" });
  return { message: parsed.data.message };
}
