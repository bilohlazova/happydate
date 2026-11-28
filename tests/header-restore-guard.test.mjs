// Real Header (account name, unread badge, notification panel) outside PrivateSnapshotBoundary.
// Synthetic auth, profile and notification API; component lifecycle only, not a browser BFCache run.
import test from "node:test";
import assert from "node:assert/strict";
import { headerHarness } from "./helpers/header-snapshot-harness.mjs";

async function withHeader(fn, options) { const h = await headerHarness(options); try { await fn(h); } finally { await h.dispose(); } }
const NAME_A = "HDR_NAME_A", NAME_B = "HDR_NAME_B", NOTE_A = "NOTE_PRIVATE_A";
const leaks = (h, from, marker) => h.w.__commits.slice(from).filter((c) => c.text.includes(marker));

test("header: A's name and unread badge are rendered for A", () => withHeader(async (h) => {
  assert.ok(h.text().includes(NAME_A));
  assert.ok(h.text().includes("3"), "unread badge");
}));

test("header: logout and A -> B never expose A in any commit", () => withHeader(async (h) => {
  const from = h.w.__commits.length;
  await h.auth("B");
  assert.ok(!h.text().includes(NAME_A));
  assert.equal(leaks(h, from, NAME_A).filter((c) => c.owner !== "A").length, 0);
  await h.auth(null, "SIGNED_OUT");
  assert.ok(!h.text().includes(NAME_B));
}));

test("header BFCache: logout while frozen (no auth event) hides A's name, badge and open inbox", () => withHeader(async (h) => {
  h.holdAuth();
  await h.click('button[aria-label]:has(svg)'); // open the notification panel
  assert.ok(h.text().includes(NOTE_A), "control: the open panel shows A's notification before the freeze");
  const from = h.w.__commits.length;
  await h.transition("pagehide");
  h.silentSession(null);
  await h.transition("pageshow");
  assert.ok(!h.text().includes(NAME_A), "name hidden before the owner is verified");
  assert.ok(!h.text().includes(NOTE_A), "notification content hidden");
  await h.verifyMissing(0);
  assert.ok(!h.text().includes(NAME_A));
  assert.ok(!h.text().includes(NOTE_A));
  assert.equal(leaks(h, from, NAME_A).length, 0, "no commit after pagehide contains A's name");
}));

test("header BFCache: another account while frozen never shows A, then B after the auth event", () => withHeader(async (h) => {
  h.holdAuth();
  const from = h.w.__commits.length;
  await h.transition("pagehide");
  h.silentSession("B");
  await h.transition("pageshow");
  await h.verify(0, "B");
  assert.ok(!h.text().includes(NAME_A));
  assert.equal(leaks(h, from, NAME_A).length, 0);
  await h.auth("B");
  assert.ok(h.text().includes(NAME_B) && !h.text().includes(NAME_A));
}));

test("header BFCache: same owner is shown again only after verification", () => withHeader(async (h) => {
  h.holdAuth();
  await h.transition("pagehide"); await h.transition("pageshow");
  assert.ok(!h.text().includes(NAME_A));
  await h.verify(0, "A");
  assert.ok(h.text().includes(NAME_A));
}));

test("header BFCache: offline restore stays hidden; online retries once; repeated pagehide/pageshow cycles stay protected", () => withHeader(async (h) => {
  h.holdAuth();
  await h.transition("pagehide"); await h.transition("pageshow"); await h.verifyError(0);
  assert.ok(!h.text().includes(NAME_A));
  await h.transition("online", false);
  assert.equal(h.checks.length, 2);
  await h.transition("online", false);
  assert.equal(h.checks.length, 2, "no stacked retries");
  await h.verify(1, "A");
  assert.ok(h.text().includes(NAME_A));
  for (let cycle = 0; cycle < 3; cycle++) {
    await h.transition("pagehide");
    assert.ok(!h.text().includes(NAME_A), `cycle ${cycle}: hidden on pagehide`);
    h.silentSession(cycle === 2 ? null : "A");
    const before = h.checks.length;
    await h.transition("pageshow");
    assert.equal(h.checks.length, before + 1, `cycle ${cycle}: exactly one verification`);
    assert.ok(!h.text().includes(NAME_A), `cycle ${cycle}: not shown before verification`);
    if (cycle === 2) await h.verifyMissing(before); else await h.verify(before, "A");
  }
  assert.ok(!h.text().includes(NAME_A), "last cycle: session is gone, A stays hidden");
}));
