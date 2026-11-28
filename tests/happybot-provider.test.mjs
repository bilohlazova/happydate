// HD-CHAT-002 Phase 1A: the one root-layout HappyBotProvider. Runs the REAL provider, useHappyBot,
// UserScopedChatAssistant and ChatAssistantModal in jsdom against a fake auth bus and a fake
// /api/ai-chat (no paid AI is ever called). Entry points are driven through useHappyBot().open().
import test from "node:test";
import assert from "node:assert/strict";
import { closeBrowser, createBrowser, USERS } from "./helpers/chat-harness/harness.mjs";

const personA = USERS.A.people[0];
const personAFriend = USERS.A.people[1];
const giftA = { personId: personA.id, eventId: "event-A-birthday", mode: "selection" };

async function withBrowser(fn, variant = "provider") {
  const browser = createBrowser(variant);
  try { await fn(browser); } finally { closeBrowser(browser); }
}

test("nothing is mounted and no AI request is made until the first open() (no paid call on page load)", () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.settle(200);
  assert.equal(tab.requests.length, 0, "no /api/ai-chat request on mount");
  assert.equal(tab.dialogCount(), 0, "no dialog before open");
  assert.equal(tab.pageState().open, false);
}));

test("open() with a prompt sends exactly one request; a repeated open() of the same context sends and renders nothing more", () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  const request = { scope: { type: "person", personId: personA.id }, giftRequest: giftA, initialPrompt: "ПРОМПТ-А-подарунок" };
  await tab.openBotTwiceInOneTick(request);
  assert.equal(tab.requests.length, 1, "double open in one tick: one request");
  assert.equal(tab.dialogCount(), 1, "one dialog");
  await tab.openBot(request);
  await tab.settle(300);
  assert.equal(tab.requests.length, 1, "re-open while open: still one request");
  assert.equal(tab.dialogCount(), 1);
}));

test("messages survive close and re-open and re-opening sends nothing", () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.openBot();
  await tab.send("Привіт, Happy");
  assert.equal(tab.requests.length, 1);
  assert.match(tab.text(), /ВІДПОВІДЬ-HAPPY/);
  await tab.closeBot();
  assert.equal(tab.dialogCount(), 0, "closed");
  await tab.openBot();
  assert.match(tab.text(), /Привіт, Happy/, "own message restored");
  assert.match(tab.text(), /ВІДПОВІДЬ-HAPPY/, "answer restored");
  assert.equal(tab.requests.length, 1, "no new request on re-open");
}));

test("switching context keeps each conversation and never sends one context's text in another's request", () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.openBot({ scope: { type: "person", personId: personA.id } });
  await tab.send("ПРИВАТНО-ПРО-МАМУ");
  await tab.openBot({ scope: { type: "person", personId: personAFriend.id } });
  assert.ok(!tab.text().includes("ПРИВАТНО-ПРО-МАМУ"), "friend context does not show mama's messages");
  await tab.send("Питання про друга");
  const friendRequest = tab.lastRequest();
  assert.equal(friendRequest.body.conversation.length, 0, "payload carries no other context history");
  // context.people is the owner's own contact list (pre-existing, for name resolution), not conversation data.
  assert.equal(friendRequest.body.context.activePersonId, personAFriend.id, "active person is the friend");
  assert.equal(friendRequest.body.context.giftRequest ?? null, null, "no gift context of another segment");
  assert.deepEqual(JSON.parse(JSON.stringify(friendRequest.body.scope)), { type: "person", personId: personAFriend.id });
  assert.ok(!JSON.stringify(friendRequest.body).includes("ПРИВАТНО-ПРО-МАМУ"), "mama's text is not in friend's payload");
  await tab.openBot();
  assert.deepEqual(JSON.parse(JSON.stringify(tab.pageState().scope)), { type: "global" });
  await tab.openBot({ scope: { type: "person", personId: personA.id } });
  assert.match(tab.text(), /ПРИВАТНО-ПРО-МАМУ/, "mama's conversation restored on return");
}));

test("request body through the provider equals the body of the pre-provider page wiring", async () => {
  async function bodyOf(variant, drive) {
    let body;
    await withBrowser(async (browser) => {
      await browser.signIn("A");
      const tab = await browser.newTab();
      await drive(tab);
      body = tab.requests[0]?.body;
    }, variant);
    return body;
  }
  const scope = { type: "person", personId: personA.id };
  const viaProvider = await bodyOf("provider", async (tab) => { await tab.openBot({ scope, giftRequest: giftA, initialPrompt: "ПРОМПТ" }); await tab.settle(400); });
  const viaPage = await bodyOf("patched", async (tab) => {
    await tab.setScope(scope); await tab.setGift(giftA); await tab.setPrompt("ПРОМПТ"); await tab.open(); await tab.settle(400);
  });
  assert.ok(viaProvider && viaPage, "both paths sent a request");
  assert.deepEqual(JSON.parse(JSON.stringify(viaProvider)), JSON.parse(JSON.stringify(viaPage)));
});

test("sign-out / account switch closes the sheet and drops everything private; B sees nothing of A", () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.openBot({ scope: { type: "person", personId: personA.id }, giftRequest: giftA, initialPrompt: "ПРОМПТ-А" });
  await tab.settle(400);
  assert.ok(tab.requests.length >= 1);
  await browser.signOut();
  await browser.signIn("B");
  assert.equal(tab.dialogCount(), 0, "sheet closed");
  assert.equal(tab.pageState().open, false);
  assert.deepEqual(JSON.parse(JSON.stringify(tab.pageState().scope)), { type: "global" });
  const before = tab.requests.length;
  await tab.openBot();
  assert.ok(!tab.text().includes("ПРОМПТ-А"), "A's prompt is gone");
  await tab.send("Привіт, це Б");
  const request = tab.requests[before];
  assert.match(request.authorization, /token-B/);
  assert.equal(request.body.conversation.length, 0);
  const serialized = JSON.stringify(request.body);
  assert.ok(!serialized.includes(personA.id) && !serialized.includes("event-A-birthday") && !serialized.includes("ПРОМПТ-А"));
}));

test("a token refresh of the same owner keeps the open sheet and its conversation", () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.openBot();
  await tab.send("Лишається після refresh");
  await browser.refreshToken();
  assert.equal(tab.dialogCount(), 1, "still open");
  assert.match(tab.text(), /Лишається після refresh/);
}));

test("a route change closes the sheet and cancels a running answer; the conversation is kept", () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.openBot();
  tab.holdNextReply();
  await tab.send("Довга відповідь");
  assert.ok(tab.heldRequest, "stream is running");
  assert.equal(tab.heldRequest.signal.aborted, false);
  await tab.navigate("/people/some-person");
  assert.equal(tab.dialogCount(), 0, "closed on route change");
  assert.equal(tab.heldRequest.signal.aborted, true, "running answer cancelled");
  await tab.openBot();
  assert.match(tab.text(), /Довга відповідь/, "own message kept");
  assert.equal(tab.requests.length, 1, "no resend");
}));

test("both legacy launch events open the one general chat, exactly once", () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.dispatch("hd:openChat");
  assert.equal(tab.dialogCount(), 1);
  await tab.closeBot();
  await tab.dispatch("happydate:open-chat");
  assert.equal(tab.dialogCount(), 1);
  assert.equal(tab.requests.length, 0, "opening never sends by itself");
}));

test("no message text is written to web storage", () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.openBot();
  await tab.send("СЕКРЕТНИЙ-ТЕКСТ");
  const dump = JSON.stringify({ ...tab.window.localStorage }) + JSON.stringify({ ...tab.window.sessionStorage });
  assert.ok(!dump.includes("СЕКРЕТНИЙ-ТЕКСТ") && !dump.includes("ВІДПОВІДЬ-HAPPY"));
}));

test("BFCache: the open sheet is hidden on pagehide and returns only for the same verified owner", () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.openBot();
  await tab.send("Приватне повідомлення А");
  await tab.pagehide();
  assert.equal(tab.dialogCount(), 0, "private sheet removed before the page is cached");
  assert.ok(!tab.text().includes("Приватне повідомлення А"));
  await tab.pageshowFromBfcache();
  assert.equal(tab.dialogCount(), 1, "same owner verified: sheet is back");
  assert.match(tab.text(), /Приватне повідомлення А/);
}));

test("BFCache: restored after the session is gone, the sheet and its messages stay hidden", () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.openBot();
  await tab.send("Приватне повідомлення А");
  await tab.pagehide();
  browser.session = null; // storage emptied while the page was frozen: auth-js emits no event
  await tab.pageshowFromBfcache();
  assert.equal(tab.dialogCount(), 0, "no session: sheet stays hidden");
  assert.ok(!tab.text().includes("Приватне повідомлення А"));
}));
