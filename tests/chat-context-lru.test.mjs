// HD-CHAT-001 Phase 0.1 (P2-1): least-recently-used policy for the hidden per-context
// conversations, exercised on the real components in jsdom (fake auth bus). Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { closeBrowser, createBrowser, VARIANT } from "./helpers/chat-harness/harness.mjs";

const sc = (n) => ({ type: "person", personId: `p${n}` });
const mark = (n) => `МАРКЕР-p${n}`;
async function withBrowser(fn) {
  const browser = createBrowser();
  try { await fn(browser); } finally { closeBrowser(browser); }
}
async function chatIn(tab, n) { await tab.setScope(sc(n)); await tab.send(mark(n)); }
async function has(tab, n) { await tab.setScope(sc(n)); return tab.text().includes(mark(n)); }

test(`[${VARIANT}] p1..p6 -> p1 -> p7: p1 is restored with its own history, the least recently used (p2) is evicted`, () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.setScope(sc(1)); await tab.open(); await tab.send(mark(1));
  for (const n of [2, 3, 4, 5, 6]) await chatIn(tab, n);
  assert.equal(await has(tab, 1), true, "back to p1: its history is restored");
  assert.ok(!tab.text().includes(mark(2)), "p2's text never shows in p1's context");
  await chatIn(tab, 7);
  assert.equal(await has(tab, 1), true, "p1 survives the 7th context because it was just used");
  assert.equal(await has(tab, 7), true, "the active context was kept");
  assert.equal(await has(tab, 3), true, "p3 still there");
  assert.equal(await has(tab, 2), false, "the least recently used context (p2) was evicted");
}));

test(`[${VARIANT}] the active context is never evicted while many contexts are visited`, () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.setScope(sc(1)); await tab.open();
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    await chatIn(tab, n);
    assert.ok(tab.text().includes(mark(n)), `active p${n} keeps its conversation`);
  }
}));

test(`[${VARIANT}] visiting contexts without chatting does not push real conversations out`, () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.setScope(sc(1)); await tab.open(); await tab.send(mark(1));
  await chatIn(tab, 2); await chatIn(tab, 3);
  for (const n of [11, 12, 13, 14, 15, 16, 17, 18]) await tab.setScope(sc(n)); // browse only
  for (const n of [1, 2, 3]) assert.equal(await has(tab, n), true, `p${n} survived the browsing`);
}));

test(`[${VARIANT}] an unfinished request is cancelled when its context is left, and its answer never appears`, () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.setScope(sc(1)); await tab.open();
  tab.holdNextReply(); await tab.send(mark(1));
  await tab.setScope(sc(2)); // leaving p1 hides it: the existing close behaviour aborts its stream
  assert.equal(tab.heldRequest.signal.aborted, true, "pending request was aborted");
  await tab.releaseHeld("ПІЗНЯ-ВІДПОВІДЬ-p1");
  assert.ok(!tab.text().includes("ПІЗНЯ-ВІДПОВІДЬ-p1"), "not shown in p2");
  await tab.setScope(sc(1));
  assert.ok(!tab.text().includes("ПІЗНЯ-ВІДПОВІДЬ-p1"), "not shown after returning to p1 either");
  assert.deepEqual(tab.memoryUpdates, []);
}));

test(`[${VARIANT}] logout clears every kept context of the owner and none returns when the same user signs in again`, () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.setScope(sc(1)); await tab.open(); await tab.send(mark(1));
  for (const n of [2, 3, 4]) await chatIn(tab, n);
  await browser.signOut();
  await browser.signIn("A");
  await tab.open();
  for (const n of [1, 2, 3, 4]) assert.equal(await has(tab, n), false, `p${n} is gone after logout`);
}));

test(`[${VARIANT}] A -> B leaves no context of A, even for the same context keys`, () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.setScope(sc(1)); await tab.open(); await tab.send(mark(1));
  for (const n of [2, 3, 4, 5, 6, 7]) await chatIn(tab, n);
  await browser.signIn("B");
  await tab.open();
  for (const n of [1, 2, 3, 4, 5, 6, 7]) assert.equal(await has(tab, n), false, `p${n} of A is not visible to B`);
  await tab.send("Привіт, це Б");
  assert.equal(tab.lastRequest().body.conversation.length, 0);
  assert.match(tab.lastRequest().authorization, /token-B/);
}));
