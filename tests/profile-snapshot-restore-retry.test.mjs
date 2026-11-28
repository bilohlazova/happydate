// Phase 0.6 proposal evidence: failed BFCache owner verification must not leave an endless spinner,
// and a retry must re-verify the owner before any private content returns.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { profileHarness } from "./helpers/profile-snapshot-harness.mjs";

const marker = "OWNER_A_PRIVATE_MARKER_HDCHAT001";
async function withProfile(fn) { const h = await profileHarness(); try { await fn(h); } finally { await h.dispose(); } }
async function loaded(h) { await h.resolve(0, marker); assert.ok(h.text().includes(marker + "-HISTORY")); }
const retryButton = (h) => [...h.w.document.querySelectorAll("button")].find((b) => b.textContent.includes("privateRestore.retry"));
async function failRestore(h) { await loaded(h); h.holdAuth(); await h.transition("pagehide"); await h.transition("pageshow"); await h.verifyError(0); }

test("failed restore verification shows a retry action instead of a bare spinner", () => withProfile(async (h) => {
  await failRestore(h);
  assert.ok(h.w.document.querySelector('[role="alert"]'));
  assert.ok(retryButton(h));
  assert.ok(!h.text().includes(marker));
}));

test("retry re-verifies the owner; private content returns only after verification and a fresh load", () => withProfile(async (h) => {
  await failRestore(h);
  await h.act(() => retryButton(h).click()); await h.settle();
  assert.equal(h.checks.length, 2, "retry calls getUser again");
  assert.ok(h.w.document.querySelector('[aria-busy="true"]') && !retryButton(h), "closed spinner while retrying");
  assert.equal(h.pending.length, 1, "no private loader before verification");
  await h.verify(1, "A"); assert.equal(h.pending.length, 2); assert.ok(!h.text().includes(marker));
  await h.resolve(1, marker); assert.ok(h.text().includes(marker + "-HISTORY"));
}));

test("retry that resolves to another account stays closed", () => withProfile(async (h) => {
  await failRestore(h);
  await h.act(() => retryButton(h).click()); await h.settle();
  await h.verify(1, "B"); assert.ok(!h.text().includes(marker)); assert.equal(h.pending.length, 1);
}));

test("network return after a failed verification retries automatically, still verified first", () => withProfile(async (h) => {
  await failRestore(h);
  await h.act(() => h.w.dispatchEvent(new h.w.Event("online"))); await h.settle();
  assert.equal(h.checks.length, 2);
  await h.verify(1, "A"); assert.equal(h.pending.length, 2);
}));

test("online event without a failed restore does not verify or reload anything", () => withProfile(async (h) => {
  await loaded(h); h.holdAuth();
  await h.act(() => h.w.dispatchEvent(new h.w.Event("online"))); await h.settle();
  assert.equal(h.checks.length, 0); assert.ok(h.text().includes(marker + "-HISTORY"));
}));

test("a stale failure cannot overwrite a newer successful retry", () => withProfile(async (h) => {
  await failRestore(h);
  await h.act(() => retryButton(h).click()); await h.settle();      // check #1 in flight
  await h.transition("pagehide"); await h.transition("pageshow");   // new restore => check #2
  await h.verifyError(1);                                           // stale failure from check #1
  assert.ok(!retryButton(h), "stale failure ignored while a newer check is pending");
  await h.verify(2, "A"); assert.equal(h.pending.length, 2);
}));

test("restore-failure texts exist in all five locales, are non-empty and localized", async () => {
  const texts = {};
  for (const locale of ["pl", "en", "uk", "de", "ru"]) {
    const messages = JSON.parse(await readFile(new URL(`../messages/${locale}/navigation.json`, import.meta.url), "utf8"));
    const { unverified, retry } = messages.privateRestore ?? {};
    assert.ok(unverified?.trim() && retry?.trim(), `${locale} has privateRestore.unverified and retry`);
    assert.ok(!/[{}]/.test(unverified + retry), `${locale} has no unresolved placeholders`);
    texts[locale] = unverified + "|" + retry;
  }
  assert.equal(new Set(Object.values(texts)).size, 5, "each locale has its own text");
});

test("repeated online events while a verification is pending do not start a retry loop", () => withProfile(async (h) => {
  await failRestore(h);
  await h.act(() => h.w.dispatchEvent(new h.w.Event("online"))); await h.settle();
  assert.equal(h.checks.length, 2);
  // verification #2 is still pending (not failed): extra online events must not stack requests
  await h.act(() => { h.w.dispatchEvent(new h.w.Event("online")); h.w.dispatchEvent(new h.w.Event("online")); }); await h.settle();
  assert.equal(h.checks.length, 2, "no new check while none has failed");
  await h.verifyError(1); await h.settle();
  assert.ok(retryButton(h), "after a second failure the user gets the retry action again, not an automatic loop");
  assert.equal(h.checks.length, 2);
}));
