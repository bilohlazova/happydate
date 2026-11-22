/**
 * Model routing. Every model here must be priced in AI_COST_POLICY /
 * assertPricedAiModel (SEC-01); an unpriced model fails closed with 503.
 * Moving conversation or gift ideation to a stronger model requires a
 * separately reviewed pricing policy, so all roles share one priced model.
 */
const PRICED_MODEL = "gpt-4.1-mini";

export const ASSISTANT_CHAT_CONFIG = {
  model: PRICED_MODEL,
  giftModel: PRICED_MODEL,
  utilityModel: PRICED_MODEL,
  temperature: 0.7,
  maxConversationMessages: 12,
  maxConversationCharacters: 8_000,
  maxConversationContentLength: 2_000,
  maxEvents: 10,
  maxPeople: 20,
  maxMemoryPeople: 10,
  maxMemoriesPerPerson: 5,
  maxMemoriesTotal: 50,
  maxMessageLength: 2_000,
  maxOutputTokens: 700,
  requestTimeoutMs: 60_000,
  concurrentRequests: 2,
  concurrentLeaseSeconds: 75,
} as const;

export const ASSISTANT_RATE_LIMITS = {
  authenticated: { requests: 20, windowSeconds: 600 },
  guest: { requests: 5, windowSeconds: 600 },
} as const;

export type AssistantIdentityKind = keyof typeof ASSISTANT_RATE_LIMITS;
