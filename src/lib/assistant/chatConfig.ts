export const ASSISTANT_CHAT_CONFIG = {
  model: "gpt-4.1-mini",
  temperature: 0.5,
  maxConversationMessages: 12,
  maxConversationCharacters: 8_000,
  maxConversationContentLength: 2_000,
  maxEvents: 10,
  maxPeople: 20,
  maxMessageLength: 2_000,
  maxOutputTokens: 700,
  requestTimeoutMs: 30_000,
  concurrentRequests: 2,
  concurrentLeaseSeconds: 45,
} as const;

export const ASSISTANT_RATE_LIMITS = {
  authenticated: { requests: 20, windowSeconds: 600 },
  guest: { requests: 5, windowSeconds: 600 },
} as const;

export type AssistantIdentityKind = keyof typeof ASSISTANT_RATE_LIMITS;
