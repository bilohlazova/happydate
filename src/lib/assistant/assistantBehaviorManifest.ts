import { ASSISTANT_CHAT_CONFIG } from "./chatConfig.ts";

/**
 * Immutable identity of the behavior currently presented as Happy.
 * Any prompt, context schema, model, temperature or output-budget change must
 * produce a new behaviorVersion and, where applicable, a new component version.
 */
export const ASSISTANT_BEHAVIOR_MANIFEST = Object.freeze({
  schemaVersion: 1,
  behaviorVersion: "assistant-2026-09-16.1",
  promptVersion: "happy-system-prompt-v4",
  promptFingerprint: "sha256:27787e7860c1ee9534f1afd10473075047a35d2811ac23441224ed21684d8cd3",
  contextSchemaVersion: "assistant-context-v8",
  modelConfigVersion: "chat-model-config-v1",
  model: ASSISTANT_CHAT_CONFIG.model,
  temperature: ASSISTANT_CHAT_CONFIG.temperature,
  maxOutputTokens: ASSISTANT_CHAT_CONFIG.maxOutputTokens,
} as const);
