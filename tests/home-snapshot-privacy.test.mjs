// Route "/" is public (guest home) and has no PrivateSnapshotBoundary. This verifies, with the REAL
// HomePageClient + AuthProvider and synthetic data, that private home data does not outlive the owner.
// Component lifecycle test only; real BFCache needs a browser (see readiness report).
import test from "node:test";
import assert from "node:assert/strict";
import { homeHarness } from "./helpers/home-snapshot-harness.mjs";

async function withHome(fn, options) { const h = await homeHarness(options); try { await fn(h); } finally { await h.dispose(); } }
const A = "HOME_PRIVATE_A", B = "HOME_PRIVATE_B";

test("home: A is rendered for A", () => withHome(async (h) => { assert.ok(h.text().includes(A)); }));

test("home: logout removes A's snapshot and shows the guest page", () => withHome(async (h) => {
  assert.ok(h.text().includes(A));
  await h.auth(null, "SIGNED_OUT");
  assert.ok(!h.text().includes(A));
  noForeign(h, A, "A");
}));

const noForeign = (h, marker, owner) => assert.ok(h.w.__commits.every((c) => c.owner === owner || !c.text.includes(marker)), `no committed render shows ${marker} under another identity`);

test("home: A -> B never shows A (in any commit) and then shows B", () => withHome(async (h) => {
  await h.auth("B");
  assert.ok(!h.text().includes(A));
  assert.ok(h.text().includes(B));
  noForeign(h, A, "A");
}));

test("home: B -> A after A -> B shows only A", () => withHome(async (h) => {
  await h.auth("B"); await h.auth("A");
  assert.ok(!h.text().includes(B)); assert.ok(h.text().includes(A));
  noForeign(h, B, "B");
}));

test("home: A's late load resolving after logout stays hidden", () => withHome(async (h) => {
  assert.equal(h.pending.length, 1); assert.ok(!h.text().includes(A));
  await h.auth(null, "SIGNED_OUT"); await h.release(0);
  assert.ok(!h.text().includes(A));
}, { hold: true }));

test("home: A's late load cannot replace B's snapshot", () => withHome(async (h) => {
  await h.auth("B"); assert.equal(h.pending.length, 2);
  await h.release(1); assert.ok(h.text().includes(B));
  await h.release(0); assert.ok(h.text().includes(B)); assert.ok(!h.text().includes(A));
}, { hold: true }));

test("home: same-owner TOKEN_REFRESHED keeps the snapshot", () => withHome(async (h) => {
  const before = h.pending.length;
  await h.auth("A", "TOKEN_REFRESHED");
  assert.ok(h.text().includes(A));
  assert.equal(h.pending.length, before, "token refresh does not trigger another home load");
}));

test("home: unresolved authentication renders no private data", () => withHome(async (h) => {
  assert.ok(!h.text().includes(A));
}, { owner: null }));

// --- BFCache: "/" is outside PrivateSnapshotBoundary, so useHomeRestoreGuard protects it. ---
const afterFreeze = (h, from) => h.w.__commits.slice(from);
const leaks = (h, from, marker) => afterFreeze(h, from).filter((c) => c.text.includes(marker));

test("home BFCache: pagehide removes A's private DOM before the page is cached", () => withHome(async (h) => {
  assert.ok(h.text().includes(A));
  await h.transition("pagehide");
  assert.ok(!h.text().includes(A));
}));

test("home BFCache: logout while frozen (no auth event) never shows A again, guest view after verification", () => withHome(async (h) => {
  h.holdAuth();
  const from = h.w.__commits.length;
  await h.transition("pagehide");
  h.silentSession(null);
  await h.transition("pageshow");
  assert.ok(!h.text().includes(A), "hidden while the owner is unverified");
  assert.equal(h.checks.length, 1);
  const loads = h.w.__loads;
  await h.verifyMissing(0);
  assert.equal(h.w.__loads, loads, "no reload when the session is gone");
  assert.ok(!h.text().includes(A));
  assert.equal(leaks(h, from, A).length, 0, "no committed render after pagehide contains A");
}));

test("home BFCache: another account signed in while frozen never sees A's data", () => withHome(async (h) => {
  h.holdAuth();
  const from = h.w.__commits.length;
  await h.transition("pagehide");
  h.silentSession("B");
  await h.transition("pageshow");
  const loads = h.w.__loads;
  await h.verify(0, "B");
  assert.equal(h.w.__loads, loads, "a foreign owner never triggers a reload of A's home");
  assert.ok(!h.text().includes(A));
  assert.equal(leaks(h, from, A).length, 0);
  await h.auth("B");
  assert.ok(h.text().includes(B) && !h.text().includes(A));
}));

test("home BFCache: same owner is shown again only after getUser confirms them", () => withHome(async (h) => {
  h.holdAuth();
  await h.transition("pagehide");
  await h.transition("pageshow");
  assert.ok(!h.text().includes(A), "not shown before verification");
  await h.verify(0, "A");
  assert.ok(h.text().includes(A));
}));

test("home BFCache: offline restore stays hidden, shows a retry, never loops", () => withHome(async (h) => {
  h.holdAuth();
  await h.transition("pagehide");
  await h.transition("pageshow");
  await h.verifyError(0);
  assert.ok(!h.text().includes(A));
  assert.ok(h.w.document.querySelector('[role="alert"]'), "retry state is visible");
  assert.equal(h.checks.length, 1, "no automatic retry loop");
  await h.transition("online", false);
  assert.equal(h.checks.length, 2, "online triggers exactly one retry");
  await h.transition("online", false);
  assert.equal(h.checks.length, 2, "a pending retry is not stacked by repeated online events");
  await h.verify(1, "A");
  assert.ok(h.text().includes(A));
  assert.ok(!h.w.document.querySelector('[role="alert"]'));
  const settled = h.checks.length; // the reminder code also calls getUser after a reload
  await h.transition("online", false);
  assert.equal(h.checks.length, settled, "no retry once verified");
}));

test("home BFCache: retry button verifies again", () => withHome(async (h) => {
  h.holdAuth();
  await h.transition("pagehide"); await h.transition("pageshow"); await h.verifyError(0);
  await h.click('[role="alert"] button');
  assert.equal(h.checks.length, 2);
  await h.verify(1, "A");
  assert.ok(h.text().includes(A));
}));

test("home BFCache: a stale verification cannot reopen a page that was hidden again", () => withHome(async (h) => {
  h.holdAuth();
  await h.transition("pagehide"); await h.transition("pageshow");
  await h.transition("pagehide");
  await h.verify(0, "A");
  assert.ok(!h.text().includes(A));
}));

test("home BFCache: a page that was not restored from BFCache is not hidden or re-verified", () => withHome(async (h) => {
  h.holdAuth();
  await h.transition("pageshow", false);
  assert.ok(h.text().includes(A));
  assert.equal(h.checks.length, 0);
}));
