import { ASSISTANT_CHAT_CONFIG } from "./chatConfig.ts";

/**
 * Immutable identity of the behavior currently presented as Happy.
 * Any prompt, context schema, model, temperature or output-budget change must
 * produce a new behaviorVersion and, where applicable, a new component version.
 */
export const ASSISTANT_BEHAVIOR_MANIFEST = Object.freeze({
  schemaVersion: 1,
  behaviorVersion: "assistant-2026-09-07.1",
  promptVersion: "happy-system-prompt-v4",
  promptFingerprint: "sha256:5848b2ddbe85559a001a1e0cd0ed9ee90478122aa8f50500d1256d2595dea732",
  contextSchemaVersion: "assistant-context-v8",
  modelConfigVersion: "chat-model-config-v1",
  model: ASSISTANT_CHAT_CONFIG.model,
  temperature: ASSISTANT_CHAT_CONFIG.temperature,
  maxOutputTokens: ASSISTANT_CHAT_CONFIG.maxOutputTokens,
} as const);
