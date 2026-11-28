// Sequences around BFCache restores on a private route (real PrivateSnapshotBoundary + real person profile page).
// Synthetic auth only; real browser BFCache scenarios are listed as BLOCKED in the Phase 0.8 report.
import test from "node:test";
import assert from "node:assert/strict";
import { profileHarness } from "./helpers/profile-snapshot-harness.mjs";

const marker = "OWNER_A_PRIVATE_MARKER_HDCHAT001";
async function withProfile(fn, options) { const h = await profileHarness(options); try { await fn(h); } finally { await h.dispose(); } }
async function loaded(h) { await h.resolve(0, marker); assert.ok(h.text().includes(marker + "-HISTORY")); }
const exposed = (h, from) => h.w.__commits.slice(from).filter((c) => c.text.includes(marker));

test("A -> logout in another document -> Back: A's profile never reappears, with or without an auth event", () => withProfile(async (h) => {
  await loaded(h);
  h.holdAuth();
  const from = h.w.__commits.length;
  await h.transition("pagehide");
  h.silentSession(null);
  await h.transition("pageshow");
  assert.ok(!h.text().includes(marker), "hidden while unverified");
  await h.verify(0, null);
  assert.ok(!h.text().includes(marker), "stays hidden for a signed-out owner");
  assert.equal(h.pending.length, 1, "no reload of private data for a signed-out owner");
  assert.equal(exposed(h, from).length, 0, "no commit after pagehide contains A's data");
}));

test("A -> logout -> B signs in -> Back: B never sees A's profile, before or after the auth event", () => withProfile(async (h) => {
  await loaded(h);
  h.holdAuth();
  const from = h.w.__commits.length;
  await h.transition("pagehide");
  h.silentSession("B");
  await h.transition("pageshow");
  await h.verify(0, "B");
  assert.ok(!h.text().includes(marker));
  await h.auth("B");
  assert.ok(!h.text().includes(marker));
  assert.equal(exposed(h, from).filter((c) => c.owner !== "A").length, 0, "no commit under B contains A's data");
}));

test("repeated pagehide/pageshow cycles: exactly one verification per restore, hidden until each completes", () => withProfile(async (h) => {
  await loaded(h);
  h.holdAuth();
  for (let cycle = 0; cycle < 3; cycle++) {
    await h.transition("pagehide");
    assert.ok(!h.text().includes(marker), `cycle ${cycle}: hidden on pagehide`);
    const before = h.checks.length;
    await h.transition("pageshow");
    assert.equal(h.checks.length, before + 1, `cycle ${cycle}: one verification`);
    assert.ok(!h.text().includes(marker), `cycle ${cycle}: hidden before verification`);
    await h.verify(before, "A");
    await h.resolve(h.pending.length - 1, marker);
    assert.ok(h.text().includes(marker + "-HISTORY"), `cycle ${cycle}: shown after verification`);
  }
}));

test("restoringRef stays true after a restore but cannot cause extra or wrong verifications", () => withProfile(async (h) => {
  await loaded(h);
  h.holdAuth();
  await h.transition("pagehide"); await h.transition("pageshow");
  await h.verify(0, "A"); await h.resolve(h.pending.length - 1, marker);
  const settled = h.checks.length;
  await h.auth("A", "TOKEN_REFRESHED");
  assert.equal(h.checks.length, settled, "token refresh does not re-verify");
  await h.route("person-2");
  assert.equal(h.checks.length, settled, "a new route mounts a fresh boundary state and does not re-verify");
  assert.ok(!h.text().includes(marker), "the previous person's snapshot is not reused");
  // a different owner remounts the boundary: the old flag cannot leak into the new owner's tree
  await h.auth("B");
  assert.ok(!h.text().includes(marker));
}));

test("offline -> online: hidden while offline, one retry on online, shown only after the owner is confirmed", () => withProfile(async (h) => {
  await loaded(h);
  h.holdAuth();
  await h.transition("pagehide"); await h.transition("pageshow"); await h.verifyError(0);
  assert.ok(!h.text().includes(marker));
  await h.transition("online", false);
  assert.equal(h.checks.length, 2);
  await h.verify(1, "A"); await h.resolve(h.pending.length - 1, marker);
  assert.ok(h.text().includes(marker + "-HISTORY"));
}));

test("two documents: a received cross-tab SIGNED_OUT removes the snapshot and drafts of the signed-out owner only", () => withProfile(async (h) => {
  await loaded(h);
  h.w.localStorage.setItem("happydate:symbol-draft:v2:A:p1", "A-draft");
  h.w.localStorage.setItem("happydate:symbol-draft:v2:B:p9", "B-draft");
  await h.auth(null, "SIGNED_OUT");
  assert.ok(!h.text().includes(marker));
  assert.equal(h.w.localStorage.getItem("happydate:symbol-draft:v2:A:p1"), null);
  assert.equal(h.w.localStorage.getItem("happydate:symbol-draft:v2:B:p9"), "B-draft");
}));
