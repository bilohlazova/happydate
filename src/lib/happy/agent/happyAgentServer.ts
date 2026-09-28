import type { HappyAgentIntentContext } from "../agent-context/happyAgentIntentContext.types";
import { happyAgentBirthdayModelResultSchema, happyAgentGreetingModelResultSchema } from "./happyAgent.schema.ts";
import type { HappyAgentProvider, HappyAgentResponse } from "./happyAgent.types";
import { buildGiftRecommendationBlock, happyUIBlockSchema } from "../ui/happyUIBlock.ts";

export async function createHappyAgentResponse({ intent, context, message, provider, signal }: { intent: "birthday_gift" | "write_greeting"; context: HappyAgentIntentContext; message?: string; provider: HappyAgentProvider; signal?: AbortSignal }): Promise<HappyAgentResponse> {
  const raw = await provider({ intent, context, userMessage: message, signal });
  if (intent === "birthday_gift") {
    const parsed = happyAgentBirthdayModelResultSchema.safeParse(raw);
    if (!parsed.success) throw Object.assign(new Error("invalid provider output"), { code: "invalid_provider_output" });
    const block = parsed.data.idea ? buildGiftRecommendationBlock({ idea: parsed.data.idea, intentContext: context }) : null;
    if (parsed.data.idea && !block) throw Object.assign(new Error("invalid provenance"), { code: "invalid_provider_output" });
    const response: HappyAgentResponse = {
      ...(parsed.data.message ? { message: parsed.data.message } : {}),
      ...(parsed.data.idea ? { proposedIdea: { type: "gift", title: parsed.data.idea.title, message: parsed.data.idea.message } } : {}),
      ...(block ? { ui: [happyUIBlockSchema.parse(block)] } : {}),
    };
    return response;
  }
  const parsed = happyAgentGreetingModelResultSchema.safeParse(raw);
  if (!parsed.success) throw Object.assign(new Error("invalid provider output"), { code: "invalid_provider_output" });
  return { message: parsed.data.message };
}
