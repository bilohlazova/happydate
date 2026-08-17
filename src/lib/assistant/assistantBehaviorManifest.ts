import { ASSISTANT_CHAT_CONFIG } from "./chatConfig.ts";

/**
 * Immutable identity of the behavior currently presented as Happy.
 * Any prompt, context schema, model, temperature or output-budget change must
 * produce a new behaviorVersion and, where applicable, a new component version.
 */
export const ASSISTANT_BEHAVIOR_MANIFEST = Object.freeze({
  schemaVersion: 1,
  behaviorVersion: "assistant-2026-08-16.4",
  promptVersion: "happy-system-prompt-v1",
  promptFingerprint: "sha256:27611fc94ebd2c1d651e2b4223efdc132cccc61ae25b1c989c30d2d3a1d0f680",
  contextSchemaVersion: "assistant-context-v5",
  modelConfigVersion: "chat-model-config-v1",
  model: ASSISTANT_CHAT_CONFIG.model,
  temperature: ASSISTANT_CHAT_CONFIG.temperature,
  maxOutputTokens: ASSISTANT_CHAT_CONFIG.maxOutputTokens,
} as const);
