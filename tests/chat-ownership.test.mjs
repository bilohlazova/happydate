import test from "node:test";
import assert from "node:assert/strict";
import {
  canApplyAsyncResult,
  chatContextKey,
  chatInstanceKey,
  chatOwnerKey,
  resolveChatOwner,
  sessionMatchesOwner,
} from "../src/lib/assistant/chatOwnership.ts";

const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";

test("owner is unknown while auth loads, guest without user, user with id", () => {
  assert.deepEqual(resolveChatOwner({ authLoading: true, userId: "u" }), { status: "unknown" });
  assert.deepEqual(resolveChatOwner({ authLoading: false, userId: null }), { status: "guest" });
  assert.deepEqual(resolveChatOwner({ authLoading: false, userId: undefined }), { status: "guest" });
  assert.deepEqual(resolveChatOwner({ authLoading: false, userId: "u1" }), { status: "user", userId: "u1" });
});

test("unknown owner has no key: nothing may be rendered or sent", () => {
  assert.equal(chatOwnerKey({ status: "unknown" }), null);
  assert.equal(chatInstanceKey({ status: "unknown" }, { type: "global" }, null), null);
});

test("same user keeps the same instance key; another user or guest gets a different one", () => {
  const scope = { type: "global" };
  const a = chatInstanceKey({ status: "user", userId: "A" }, scope, null);
  assert.equal(chatInstanceKey({ status: "user", userId: "A" }, scope, null), a);
  assert.notEqual(chatInstanceKey({ status: "user", userId: "B" }, scope, null), a);
  assert.notEqual(chatInstanceKey({ status: "guest" }, scope, null), a);
});

test("person, event, task and gift contexts never share a key", () => {
  const keys = new Set([
    chatContextKey({ type: "global" }, null),
    chatContextKey(undefined, null),
    chatContextKey({ type: "person", personId: P1 }, null),
    chatContextKey({ type: "person", personId: P2 }, null),
    chatContextKey({ type: "event", eventId: P1 }, null),
    chatContextKey({ type: "task", taskId: P1 }, null),
    chatContextKey({ type: "global" }, { personId: P1, eventId: "e1" }),
    chatContextKey({ type: "global" }, { personId: P2, eventId: "e1" }),
    chatContextKey({ type: "global" }, { personId: P1, eventId: "e2" }),
  ]);
  assert.equal(keys.size, 8, "undefined scope equals global; every other context is distinct");
  assert.equal(chatContextKey({ type: "global" }, { personId: P1, eventId: "e1", mode: "selection" }),
    chatContextKey({ type: "global" }, { personId: P1, eventId: "e1", mode: "supplementary" }), "gift mode does not change whose data it is");
});

test("a request may use only a session that belongs to the chat owner", () => {
  assert.equal(sessionMatchesOwner("A", "A"), true);
  assert.equal(sessionMatchesOwner("A", "B"), false);
  assert.equal(sessionMatchesOwner(null, "B"), false, "guest instance must not use a signed-in token");
  assert.equal(sessionMatchesOwner("A", null), true, "no session degrades to a guest request");
  assert.equal(sessionMatchesOwner(undefined, "B"), true, "legacy caller without owner");
});

test("an async result is applied only while mounted, not aborted, latest and same owner", () => {
  const ok = { mounted: true, aborted: false, isLatestRequest: true, ownerAtStart: "A", ownerNow: "A" };
  assert.equal(canApplyAsyncResult(ok), true);
  for (const patch of [{ mounted: false }, { aborted: true }, { isLatestRequest: false }, { ownerNow: "B" }, { ownerNow: null }]) {
    assert.equal(canApplyAsyncResult({ ...ok, ...patch }), false, JSON.stringify(patch));
  }
});
