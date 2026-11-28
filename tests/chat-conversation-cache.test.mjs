import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_KEPT_CONVERSATIONS,
  activateConversation,
  pickEvictionKey,
  reportConversationActivity,
  resetConversationCache,
} from "../src/lib/assistant/chatConversationCache.ts";

const ctx = (n) => ({ contextKey: `person:p${n}|gift:none`, scope: { type: "person", personId: `p${n}` }, giftRequest: null });
const keys = (cache) => cache.entries.map((entry) => entry.contextKey.split("|")[0].replace("person:", ""));
function visit(cache, ...numbers) { return numbers.reduce((state, n) => activateConversation(state, ctx(n)), cache); }
function withMessages(cache, ...numbers) {
  return numbers.reduce((state, n) => reportConversationActivity(state, ctx(n).contextKey, { busy: false, hasMessages: true }), cache);
}

test("cap is six", () => assert.equal(MAX_KEPT_CONVERSATIONS, 6));

test("p1..p6 -> p1 -> p7: p1 is kept, the least recently used (p2) is evicted", () => {
  let cache = resetConversationCache("user:A");
  for (const n of [1, 2, 3, 4, 5, 6]) cache = withMessages(visit(cache, n), n);
  cache = visit(cache, 1, 7);
  assert.deepEqual(keys(cache).sort(), ["p1", "p3", "p4", "p5", "p6", "p7"]);
});

test("returning to an existing context refreshes it and keeps creation order stable", () => {
  let cache = resetConversationCache("user:A");
  cache = visit(cache, 1, 2, 3, 1);
  assert.deepEqual(keys(cache), ["p1", "p2", "p3"], "order of entries never changes, so React never remounts");
  const p1 = cache.entries.find((entry) => entry.contextKey === ctx(1).contextKey);
  const p2 = cache.entries.find((entry) => entry.contextKey === ctx(2).contextKey);
  assert.ok(p1.lastUsed > p2.lastUsed);
});

test("the active context is never evicted, even when it is the oldest", () => {
  let cache = resetConversationCache("user:A");
  cache = visit(cache, 1, 2, 3);
  assert.equal(pickEvictionKey(cache.entries, ctx(1).contextKey) === ctx(1).contextKey, false);
  assert.equal(pickEvictionKey(visit(resetConversationCache("o"), 1).entries, ctx(1).contextKey), null, "single entry: nothing to evict");
  const small = activateConversation(activateConversation(resetConversationCache("o"), ctx(1), 1), ctx(2), 1);
  assert.deepEqual(keys(small), ["p2"], "cap 1 keeps only the active one");
});

test("an idle empty context goes before a conversation with messages", () => {
  let cache = resetConversationCache("user:A");
  for (const n of [1, 2, 3]) cache = withMessages(visit(cache, n), n); // p1..p3 have messages
  cache = visit(cache, 4, 5, 6); // p4..p6 only visited
  cache = visit(cache, 7, 8, 9); // three more: only empty ones may go
  assert.deepEqual(keys(cache).filter((k) => ["p1", "p2", "p3"].includes(k)).sort(), ["p1", "p2", "p3"], "conversations survive");
  assert.equal(cache.entries.length, MAX_KEPT_CONVERSATIONS);
});

test("a context with an unfinished request is evicted only as a last resort", () => {
  let cache = resetConversationCache("user:A");
  cache = visit(cache, 1, 2, 3, 4, 5, 6);
  cache = reportConversationActivity(cache, ctx(1).contextKey, { busy: true, hasMessages: true });
  for (const n of [2, 3, 4, 5, 6]) cache = reportConversationActivity(cache, ctx(n).contextKey, { busy: false, hasMessages: true });
  cache = visit(cache, 7);
  assert.ok(keys(cache).includes("p1"), "busy p1 is kept although it is the oldest");
  assert.ok(!keys(cache).includes("p2"));
  // every other context busy too -> the least recently used busy one is the defined victim
  let allBusy = visit(resetConversationCache("o"), 1, 2, 3, 4, 5, 6);
  for (const n of [1, 2, 3, 4, 5, 6]) allBusy = reportConversationActivity(allBusy, ctx(n).contextKey, { busy: true, hasMessages: true });
  allBusy = visit(allBusy, 7);
  assert.equal(allBusy.entries.length, MAX_KEPT_CONVERSATIONS, "hard cap holds even when everything is busy");
  assert.ok(!keys(allBusy).includes("p1"));
});

test("activity reports for unknown or unchanged contexts change nothing", () => {
  const cache = visit(resetConversationCache("o"), 1);
  assert.equal(reportConversationActivity(cache, "person:ghost|gift:none", { busy: true, hasMessages: true }), cache);
  assert.equal(reportConversationActivity(cache, ctx(1).contextKey, { busy: false, hasMessages: false }), cache);
});

test("invariants hold for a long pseudo-random walk: cap, active kept, no duplicates", () => {
  let seed = 12345;
  const next = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  let cache = resetConversationCache("user:A");
  for (let step = 0; step < 2000; step += 1) {
    const n = next(12);
    cache = visit(cache, n);
    if (next(3) === 0) cache = reportConversationActivity(cache, ctx(n).contextKey, { busy: next(5) === 0, hasMessages: next(2) === 0 });
    assert.ok(cache.entries.length <= MAX_KEPT_CONVERSATIONS);
    assert.ok(cache.entries.some((entry) => entry.contextKey === ctx(n).contextKey), "active context is present");
    assert.equal(new Set(cache.entries.map((entry) => entry.contextKey)).size, cache.entries.length);
  }
});

test("an owner change starts from an empty cache", () => {
  const a = visit(resetConversationCache("user:A"), 1, 2, 3);
  const b = visit(resetConversationCache("user:B"), 1);
  assert.equal(a.entries.length, 3);
  assert.deepEqual(keys(b), ["p1"]);
  assert.equal(resetConversationCache(null).entries.length, 0);
});
