import { ASSISTANT_CHAT_CONFIG } from "./chatConfig.ts";

/**
 * Immutable identity of the behavior currently presented as Happy.
 * Any prompt, context schema, model, temperature or output-budget change must
 * produce a new behaviorVersion and, where applicable, a new component version.
 */
export const ASSISTANT_BEHAVIOR_MANIFEST = Object.freeze({
  schemaVersion: 1,
  behaviorVersion: "assistant-2026-08-23.1",
  promptVersion: "happy-system-prompt-v2",
  promptFingerprint: "sha256:d39524b3077ad6ababa2af8b0cc17289aa4b434a347ca41206415ecc39134b57",
  contextSchemaVersion: "assistant-context-v6",
  modelConfigVersion: "chat-model-config-v1",
  model: ASSISTANT_CHAT_CONFIG.model,
  temperature: ASSISTANT_CHAT_CONFIG.temperature,
  maxOutputTokens: ASSISTANT_CHAT_CONFIG.maxOutputTokens,
} as const);
