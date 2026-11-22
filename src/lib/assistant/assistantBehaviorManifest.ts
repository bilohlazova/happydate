import { ASSISTANT_CHAT_CONFIG } from "./chatConfig.ts";

/**
 * Immutable identity of the behavior currently presented as Happy.
 * Any prompt, context schema, model, temperature or output-budget change must
 * produce a new behaviorVersion and, where applicable, a new component version.
 */
export const ASSISTANT_BEHAVIOR_MANIFEST = Object.freeze({
  schemaVersion: 1,
  behaviorVersion: "assistant-2026-11-22.3",
  promptVersion: "happy-system-prompt-v5",
  promptFingerprint: "sha256:d8a10670659e1fbc825733ae1b0e1105281757c9db99db1feb0eaec81b19c425",
  contextSchemaVersion: "assistant-context-v11",
  modelConfigVersion: "chat-model-config-v2",
  model: ASSISTANT_CHAT_CONFIG.model,
  temperature: ASSISTANT_CHAT_CONFIG.temperature,
  maxOutputTokens: ASSISTANT_CHAT_CONFIG.maxOutputTokens,
} as const);
