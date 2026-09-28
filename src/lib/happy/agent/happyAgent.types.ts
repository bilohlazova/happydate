import type { HappyAgentIntent, HappyAgentIntentContext } from "../agent-context/happyAgentIntentContext.types";
import type { HappyUIBlock } from "../ui/happyUIBlock.ts";

export type HappyAgentRequest = {
  intent: HappyAgentIntent;
  personId?: string;
  eventId?: string;
  taskId?: string;
  message?: string;
  locale: string;
  timezone: string;
};

export type HappyAgentModelResult = { message?: string; idea?: { title: string; message: string; reasonSources: import("../ui/happyUIBlock.ts").HappyReasonSourceRef[] } };
export type HappyAgentResponse = { message?: string; proposedIdea?: { type: "gift"; title: string; message: string }; ui?: HappyUIBlock[] };
// Future proposed actions must use typed discriminated schemas with exact
// payloads; never pass an arbitrary model-controlled object to an executor.
export type HappyAgentProviderInput = { intent: HappyAgentIntent; context: HappyAgentIntentContext; userMessage?: string; signal?: AbortSignal };
export type HappyAgentProvider = (input: HappyAgentProviderInput) => Promise<unknown>;
