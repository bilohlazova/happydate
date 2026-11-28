import type { ChatScopeInput } from "./chatScope.contract.ts";
import type { ChatGiftRequestInput } from "./chatOwnership.ts";

/**
 * Pure bookkeeping for the hidden per-context HappyBot conversations kept for ONE
 * signed-in (or guest) owner. No React, no I/O.
 *
 * Policy (HD-CHAT-001 Phase 0.1):
 * - at most MAX_KEPT_CONVERSATIONS entries exist at any time (hard cap);
 * - the active context is never evicted;
 * - eviction is least-recently-USED: activating a context refreshes its position;
 * - among the other contexts, one that is idle and empty goes first (it holds nothing),
 *   then the least recently used idle conversation with messages;
 * - a context with an unfinished request is evicted only as a last resort (every other
 *   context is also busy). Evicting unmounts it, which aborts the request and discards
 *   its answer. In practice a hidden context has no running request: closing or hiding
 *   a chat already cancels it.
 * - an owner change discards everything.
 */
export const MAX_KEPT_CONVERSATIONS = 6;

export type ConversationEntry = {
  contextKey: string;
  scope: ChatScopeInput | undefined;
  giftRequest: ChatGiftRequestInput;
  /** Monotonic use counter value of the last activation. */
  lastUsed: number;
  busy: boolean;
  hasMessages: boolean;
};

export type ConversationCache = {
  ownerKey: string | null;
  activeKey: string | null;
  tick: number;
  /** Creation order: stable, so React never reorders or remounts instances. */
  entries: ConversationEntry[];
};

export function resetConversationCache(ownerKey: string | null = null): ConversationCache {
  return { ownerKey, activeKey: null, tick: 0, entries: [] };
}

/** Context to drop so the cache fits the cap, or `null` if nothing can be dropped. */
export function pickEvictionKey(entries: readonly ConversationEntry[], activeKey: string | null): string | null {
  const candidates = entries.filter((entry) => entry.contextKey !== activeKey);
  if (candidates.length === 0) return null;
  const rank = (entry: ConversationEntry) => (entry.busy ? 2 : entry.hasMessages ? 1 : 0);
  return [...candidates].sort((a, b) => rank(a) - rank(b) || a.lastUsed - b.lastUsed)[0].contextKey;
}

/** Makes `context` the active one (creating or refreshing its entry) and enforces the cap. */
export function activateConversation(
  cache: ConversationCache,
  context: { contextKey: string; scope: ChatScopeInput | undefined; giftRequest: ChatGiftRequestInput },
  max: number = MAX_KEPT_CONVERSATIONS,
): ConversationCache {
  const tick = cache.tick + 1;
  const existing = cache.entries.some((entry) => entry.contextKey === context.contextKey);
  let entries = existing
    ? cache.entries.map((entry) => (entry.contextKey === context.contextKey ? { ...entry, lastUsed: tick } : entry))
    : [...cache.entries, { ...context, lastUsed: tick, busy: false, hasMessages: false }];
  while (entries.length > Math.max(1, max)) {
    const victim = pickEvictionKey(entries, context.contextKey);
    if (victim === null) break;
    entries = entries.filter((entry) => entry.contextKey !== victim);
  }
  return { ...cache, activeKey: context.contextKey, tick, entries };
}

/** Records what a mounted conversation reports about itself; unknown contexts are ignored. */
export function reportConversationActivity(
  cache: ConversationCache,
  contextKey: string,
  activity: { busy: boolean; hasMessages: boolean },
): ConversationCache {
  const entry = cache.entries.find((candidate) => candidate.contextKey === contextKey);
  if (!entry || (entry.busy === activity.busy && entry.hasMessages === activity.hasMessages)) return cache;
  return {
    ...cache,
    entries: cache.entries.map((candidate) => (candidate.contextKey === contextKey ? { ...candidate, ...activity } : candidate)),
  };
}
