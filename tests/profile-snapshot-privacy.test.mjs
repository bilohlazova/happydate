import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { profileHarness } from "./helpers/profile-snapshot-harness.mjs";

const marker = "OWNER_A_PRIVATE_MARKER_HDCHAT001";
async function withProfile(fn,options) {
  const h=await profileHarness(options);
  try {await fn(h);} finally {await h.dispose();}
}
async function loaded(h) {await h.resolve(0,marker);assert.ok(h.text().includes(marker+"-HISTORY"));}
function noForeignCommits(h) {
  assert.ok(h.w.__commits.every(c=>c.owner==="A" || !c.text.includes(marker)),"No intermediate commit exposes A under another identity");
}

test("SEC-01 baseline reproduction: the real unbounded page retains A history after logout",()=>withProfile(async h=>{
  await loaded(h);await h.auth(null,"SIGNED_OUT");assert.ok(h.text().includes(marker+"-HISTORY"));
},{bare:true}));

test("SEC-01 A logout synchronously removes real profile and saved HappyBot history",()=>withProfile(async h=>{
  await loaded(h);await h.auth(null,"SIGNED_OUT");assert.ok(!h.text().includes(marker));
  assert.equal(h.w.document.querySelector('[aria-label*="'+marker+'"]'),null);noForeignCommits(h);
}));

test("SEC-01 A -> B commits no A snapshot; B loads only its own profile",()=>withProfile(async h=>{
  await loaded(h);await h.auth("B");assert.ok(!h.text().includes(marker));
  assert.equal(h.pending[1].owner,"B");await h.resolve(1,"OWNER_B");
  assert.ok(h.text().includes("OWNER_B-HISTORY"));noForeignCommits(h);
}));

test("SEC-01 pending A profile completion after logout is discarded",()=>withProfile(async h=>{
  await h.auth(null,"SIGNED_OUT");await h.resolve(0,marker);assert.ok(!h.text().includes(marker));noForeignCommits(h);
}));

test("SEC-01 late A completion cannot replace B's loaded snapshot",()=>withProfile(async h=>{
  await h.auth("B");await h.resolve(1,"OWNER_B");await h.resolve(0,marker);
  assert.ok(h.text().includes("OWNER_B-HISTORY"));assert.ok(!h.text().includes(marker));noForeignCommits(h);
}));

test("SEC-01 received cross-tab SIGNED_OUT event removes private snapshot",()=>withProfile(async h=>{
  await loaded(h);await h.auth(null,"SIGNED_OUT");assert.ok(!h.text().includes(marker));noForeignCommits(h);
}));

test("SEC-01 same-owner TOKEN_REFRESHED preserves profile and does not reload",()=>withProfile(async h=>{
  await loaded(h);await h.auth("A","TOKEN_REFRESHED");assert.ok(h.text().includes(marker+"-HISTORY"));assert.equal(h.pending.length,1);
}));

test("SEC-01 person route change hides loaded snapshot before new load finishes",()=>withProfile(async h=>{
  await loaded(h);await h.route("person-2");assert.ok(!h.text().includes(marker));
  assert.ok(h.w.__commits.every(c=>c.route!=="person-2" || !c.text.includes(marker)),"No intermediate render uses the previous person snapshot");
  await h.resolve(1,"SECOND_PERSON");assert.ok(h.text().includes("SECOND_PERSON-HISTORY"));
}));

test("SEC-01 person route change while loading rejects old response",()=>withProfile(async h=>{
  await h.route("person-2");await h.resolve(1,"SECOND_PERSON");await h.resolve(0,marker);
  assert.ok(h.text().includes("SECOND_PERSON-HISTORY"));assert.ok(!h.text().includes(marker));
}));

test("SEC-01 stale profile cannot launch a person-A HappyBot under B",()=>withProfile(async h=>{
  await loaded(h);
  h.w.__route.view="profile";await h.act(()=>h.w.__render());await h.settle();
  const launcher=[...h.w.document.querySelectorAll('button')].find(b=>b.textContent.includes("profileUi.askHappy"));
  assert.ok(launcher,"real person-profile HappyBot launcher exists for A");
  await h.act(()=>launcher.click());await h.settle();
  assert.ok(h.w.document.querySelector('[role="dialog"]'),"A opens the real HappyBot");
  await h.auth("B");assert.ok(!h.text().includes(marker));
  // Even a retained DOM reference from A cannot launch a dialog after unmount.
  await h.act(()=>launcher.click());await h.settle();
  assert.equal(h.w.document.querySelector('[role="dialog"]'),null);
  assert.equal(h.w.document.querySelector('main[aria-label*="'+marker+'"]'),null);
  noForeignCommits(h);
}));

test("SEC-01 guest does not mount or load a private profile",()=>withProfile(async h=>{
  assert.equal(h.pending.length,0);assert.ok(!h.text().includes(marker));
},{owner:null}));

test("SEC-01 unresolved authentication never mounts the private subtree",()=>withProfile(async h=>{
  assert.equal(h.pending.length,0);assert.ok(h.w.document.querySelector('[aria-busy="true"]'));
},{unresolved:true}));

test("SEC-01 root layout applies the production boundary to route children",async()=>{
  const layout=await readFile(new URL('../src/app/layout.tsx',import.meta.url),'utf8');
  assert.match(layout,/<PrivateSnapshotBoundary>\{children\}<\/PrivateSnapshotBoundary>/);
});

test("SEC-01 pagehide removes private DOM before BFCache and verifies same owner before restore",()=>withProfile(async h=>{
  await loaded(h);h.holdAuth();await h.transition("pagehide");assert.ok(!h.text().includes(marker));
  await h.transition("pageshow");assert.equal(h.pending.length,1);
  await h.verify(0,"A");assert.equal(h.pending.length,2);assert.ok(!h.text().includes(marker));
  await h.resolve(1,marker);assert.ok(h.text().includes(marker+"-HISTORY"));
}));

test("SEC-01 BFCache mismatched account fails closed even before auth event",()=>withProfile(async h=>{
  await loaded(h);h.holdAuth();await h.transition("pagehide");await h.transition("pageshow");
  await h.verify(0,"B");assert.ok(!h.text().includes(marker));assert.equal(h.pending.length,1);
}));

test("SEC-01 stale restore verification cannot reopen a page hidden again",()=>withProfile(async h=>{
  await loaded(h);h.holdAuth();await h.transition("pagehide");await h.transition("pageshow");
  await h.transition("pagehide");await h.verify(0,"A");
  assert.equal(h.pending.length,1,"A stale verification must not remount the private loader");
  assert.ok(!h.text().includes(marker));
}));

test("SEC-01 failed restore verification (network error) stays closed and never reloads private data",()=>withProfile(async h=>{
  await loaded(h);h.holdAuth();await h.transition("pagehide");await h.transition("pageshow");
  await h.verifyError(0);assert.ok(!h.text().includes(marker));
  assert.equal(h.pending.length,1);assert.ok(h.w.document.querySelector('[aria-busy="true"]'));
}));

test("SEC-01 non-persisted pageshow does not start a restore verification",()=>withProfile(async h=>{
  await loaded(h);h.holdAuth();await h.transition("pageshow",false);
  assert.equal(h.checks?.length ?? 0,0);assert.ok(h.text().includes(marker+"-HISTORY"));
}));
