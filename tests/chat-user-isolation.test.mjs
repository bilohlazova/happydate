// HD-CHAT-001 Phase 0: HappyBot conversation state must never cross users, accounts or person contexts.
// Mounts the real components in jsdom (see tests/helpers/chat-harness). Synthetic data only.
// HARNESS_VARIANT=original mounts the pre-fix wiring from origin/main to prove the defects.
import test from "node:test";
import assert from "node:assert/strict";
import { closeBrowser, createBrowser, USERS, VARIANT } from "./helpers/chat-harness/harness.mjs";

const A_MARK = "Тест-Мама: ПРИВАТНЕ-А-БЮДЖЕТ-1000";

async function withBrowser(fn) {
  const browser = createBrowser();
  try { await fn(browser); } finally { closeBrowser(browser); }
}

async function chatAsA(browser, message = A_MARK) {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.open();
  await tab.send(message);
  assert.ok(tab.text().includes(message), "precondition: A's message is on screen");
  assert.ok(tab.text().includes("ВІДПОВІДЬ-HAPPY-token-A"), "precondition: Happy's reply is on screen");
  assert.ok(tab.hasPrivateChip(), "precondition: active person chip is shown");
  return tab;
}

test(`[${VARIANT}] 1. A -> logout: private messages and person context disappear`, () => withBrowser(async (browser) => {
  const tab = await chatAsA(browser);
  await browser.signOut();
  assert.ok(!tab.text().includes(A_MARK), "A's message is gone after logout");
  assert.ok(!tab.text().includes("ВІДПОВІДЬ-HAPPY-token-A"), "Happy's reply is gone after logout");
  assert.equal(tab.hasPrivateChip(), false, "link to the previous person's profile is gone");
  await tab.open();
  assert.ok(!tab.text().includes(A_MARK), "reopening as guest shows no private history");
}));

test(`[${VARIANT}] 2. A -> B without reload: B does not see A's history`, () => withBrowser(async (browser) => {
  const tab = await chatAsA(browser);
  await browser.signIn("B");
  await tab.open();
  assert.ok(!tab.text().includes(A_MARK));
  assert.ok(!tab.text().includes("Тест-Мама"));
}));

test(`[${VARIANT}] 3. A -> B: B's first request carries no conversation of A`, () => withBrowser(async (browser) => {
  const tab = await chatAsA(browser);
  await browser.signIn("B");
  await tab.open();
  const before = tab.requests.length;
  await tab.send("Привіт, це Б");
  const request = tab.requests[before];
  assert.ok(request, "B's request was sent");
  assert.match(request.authorization, /token-B/);
  assert.equal(request.body.conversation.length, 0);
  assert.ok(!JSON.stringify(request.body).includes("ПРИВАТНЕ-А"), "nothing of A anywhere in B's request");
  assert.notEqual(request.body.context.activePersonId, USERS.A.people[0].id);
}));

test(`[${VARIANT}] 4. A starts a request -> logout: the reply never appears`, () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.open();
  tab.holdNextReply();
  await tab.send(A_MARK);
  await browser.signOut();
  assert.equal(tab.heldRequest.signal.aborted, true, "the in-flight request was aborted");
  await tab.releaseHeld("ПІЗНЯ-ВІДПОВІДЬ-ДЛЯ-А");
  assert.ok(!tab.text().includes("ПІЗНЯ-ВІДПОВІДЬ-ДЛЯ-А"));
  assert.deepEqual(tab.memoryUpdates, [], "no post-answer callback for the old session");
}));

test(`[${VARIANT}] 5. A starts a request -> B signs in: A's reply is ignored`, () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.open();
  tab.holdNextReply();
  await tab.send(A_MARK);
  await browser.signIn("B");
  await tab.releaseHeld("ПІЗНЯ-ВІДПОВІДЬ-ДЛЯ-А");
  assert.ok(!tab.text().includes("ПІЗНЯ-ВІДПОВІДЬ-ДЛЯ-А"));
  await tab.open();
  assert.ok(!tab.text().includes("ПІЗНЯ-ВІДПОВІДЬ-ДЛЯ-А"));
  assert.deepEqual(tab.memoryUpdates, []);
}));

test(`[${VARIANT}] 6. Close and reopen by the same user keeps the conversation`, () => withBrowser(async (browser) => {
  const tab = await chatAsA(browser);
  await tab.close();
  await tab.open();
  assert.ok(tab.text().includes(A_MARK));
  assert.ok(tab.text().includes("ВІДПОВІДЬ-HAPPY-token-A"));
}));

test(`[${VARIANT}] 7. Token refresh of user A keeps the conversation and uses the new token`, () => withBrowser(async (browser) => {
  const tab = await chatAsA(browser);
  await browser.refreshToken();
  assert.ok(tab.dialogOpen(), "sheet stays open");
  assert.ok(tab.text().includes(A_MARK), "conversation survives the refresh");
  await tab.send("Ще одне повідомлення");
  const request = tab.lastRequest();
  assert.equal(request.authorization, "Bearer token-A-2", "new token is used");
  assert.equal(request.body.conversation.length, 2, "history is still sent for the same user");
}));

test(`[${VARIANT}] 8. Navigating to the auth page leaves no visible private data`, () => withBrowser(async (browser) => {
  const tab = await chatAsA(browser);
  await browser.signOut();
  await tab.unmount();
  await tab.mount("login");
  assert.ok(tab.text().includes("LOGIN-PAGE"));
  assert.ok(!tab.text().includes(A_MARK));
  assert.ok(!tab.text().includes("Тест-Мама"));
  assert.equal(tab.window.localStorage.length, 0, "chat writes nothing to localStorage");
  assert.equal(tab.window.sessionStorage.length, 0, "chat writes nothing to sessionStorage");
}));

test(`[${VARIANT}] 9. Two tabs: a sign-out or account switch in one never restores A in the other`, () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const first = await browser.newTab();
  const second = await browser.newTab();
  await first.open(); await first.send(A_MARK);
  await second.open(); await second.send("ПРИВАТНЕ-А-друга-вкладка");
  await browser.signIn("B"); // account switch seen by both tabs through the shared session
  for (const tab of [first, second]) {
    assert.ok(!tab.text().includes("ПРИВАТНЕ-А"), "no A text in an already open tab");
    assert.equal(tab.hasPrivateChip(), false);
  }
  const fresh = await browser.newTab(); // a tab loaded after the switch
  await fresh.open();
  assert.ok(!fresh.text().includes("ПРИВАТНЕ-А"));
  await first.open();
  const before = first.requests.length;
  await first.send("Привіт, Б");
  assert.equal(first.requests[before].body.conversation.length, 0);
  for (const tab of [first, second, fresh]) {
    assert.equal(tab.window.localStorage.length, 0);
    assert.equal(tab.window.sessionStorage.length, 0);
  }
}));

test(`[${VARIANT}] 10. Switching the active person does not carry another person's gift budget`, () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  const [mama, friend] = USERS.A.people;
  await tab.setScope({ type: "person", personId: mama.id });
  await tab.open();
  await tab.send("Бюджет подарунка для мами БЮДЖЕТ-1000-МАМА");
  assert.ok(tab.text().includes("БЮДЖЕТ-1000-МАМА"));
  await tab.setScope({ type: "person", personId: friend.id });
  assert.ok(!tab.text().includes("БЮДЖЕТ-1000-МАМА"), "mama's budget is not shown for the friend");
  const before = tab.requests.length;
  await tab.send("Підбери подарунок");
  const request = tab.requests[before];
  assert.deepEqual(request.body.scope, { type: "person", personId: friend.id });
  assert.equal(request.body.conversation.length, 0, "mama's conversation is not sent in the friend's context");
  assert.ok(!JSON.stringify(request.body).includes("БЮДЖЕТ-1000-МАМА"));
  // Gift flow: a different person/event starts a fresh conversation as well.
  await tab.setScope({ type: "global" });
  await tab.setGift({ personId: mama.id, eventId: "event-mama" });
  await tab.send("Подарунок мамі БЮДЖЕТ-500-МАМА");
  await tab.setGift({ personId: friend.id, eventId: "event-friend" });
  assert.ok(!tab.text().includes("БЮДЖЕТ-500-МАМА"));
  const beforeGift = tab.requests.length;
  await tab.send("А що другу?");
  assert.equal(tab.requests[beforeGift].body.conversation.length, 0);
  assert.deepEqual(tab.requests[beforeGift].body.context.giftRequest, { personId: friend.id, eventId: "event-friend" });
}));

test(`[${VARIANT}] 10b. Same person, same context: reopening keeps the conversation`, () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  await tab.setScope({ type: "person", personId: USERS.A.people[0].id });
  await tab.open();
  await tab.send("БЮДЖЕТ-1000-МАМА");
  await tab.close();
  await tab.open();
  assert.ok(tab.text().includes("БЮДЖЕТ-1000-МАМА"));
}));

test(`[${VARIANT}] 11. Unknown identity: nothing private is rendered until auth answers`, () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab({ gateAuth: true });
  await tab.open();
  assert.equal(tab.dialogOpen(), false, "no chat UI while the owner is unknown");
  assert.equal(tab.requests.length, 0);
  tab.releaseAuthGate();
  await tab.settle(120);
  assert.equal(tab.dialogOpen(), true, "chat appears once the owner is confirmed");
}));

test(`[${VARIANT}] 12. Auth subscription is created once and removed on unmount`, () => withBrowser(async (browser) => {
  await browser.signIn("A");
  const tab = await browser.newTab();
  assert.equal(tab.auth.listeners.size, 1);
  await tab.unmount(); assert.equal(tab.auth.listeners.size, 0);
  await tab.mount(); assert.equal(tab.auth.listeners.size, 1);
  await tab.unmount(); await tab.mount("login"); await tab.unmount();
  assert.equal(tab.auth.listeners.size, 0, "no leaked listeners after remounts");
}));

test(`[${VARIANT}] 13. Race: session changed before the auth event arrives -> A's history is not sent with B's token`, () => withBrowser(async (browser) => {
  const tab = await chatAsA(browser);
  browser.session = browser.sessionFor("B"); // token already swapped, SIGNED_IN not delivered yet
  const before = tab.requests.length;
  await tab.send("Друге повідомлення після підміни токена");
  assert.equal(tab.requests.length, before, "no request is sent under another user's token");
  await browser.broadcast("SIGNED_IN");
  assert.ok(!tab.text().includes(A_MARK));
}));

test(`[${VARIANT}] 14. Logout makes no network or storage call (server memory untouched)`, () => withBrowser(async (browser) => {
  const tab = await chatAsA(browser);
  const requests = tab.requests.length;
  tab.otherCalls.length = 0;
  await browser.signOut();
  assert.equal(tab.requests.length, requests, "no chat request on logout");
  assert.deepEqual(tab.otherCalls, [], "no other network call on logout");
}));
