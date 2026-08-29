import { ASSISTANT_CHAT_CONFIG } from "./chatConfig.ts";

/**
 * Immutable identity of the behavior currently presented as Happy.
 * Any prompt, context schema, model, temperature or output-budget change must
 * produce a new behaviorVersion and, where applicable, a new component version.
 */
export const ASSISTANT_BEHAVIOR_MANIFEST = Object.freeze({
  schemaVersion: 1,
  behaviorVersion: "assistant-2026-08-29.1",
  promptVersion: "happy-system-prompt-v3",
  promptFingerprint: "sha256:5023ae97eb34b8e0a39b829579fa9f9327bc51df0a41df1f86eb1b5fc4c6285f",
  contextSchemaVersion: "assistant-context-v7",
  modelConfigVersion: "chat-model-config-v1",
  model: ASSISTANT_CHAT_CONFIG.model,
  temperature: ASSISTANT_CHAT_CONFIG.temperature,
  maxOutputTokens: ASSISTANT_CHAT_CONFIG.maxOutputTokens,
} as const);
