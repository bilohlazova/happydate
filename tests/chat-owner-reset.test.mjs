// HD-CHAT-001 Phase 0.1 (P2-2): the page-level chat inputs (open flag, person scope, gift
// request, initial prompt) must not survive sign-out / account switch.
// Runs the real useHomeChatState (which owns useChatOwnerReset) and the real
// UserScopedChatAssistant in jsdom against a fake auth bus. HARNESS_VARIANT=original runs the
// pre-fix wiring and must FAIL; breaking useChatOwnerReset in the patched code must FAIL too.
import test from "node:test";
import assert from "node:assert/strict";
import { closeBrowser, createBrowser, USERS, VARIANT } from "./helpers/chat-harness/harness.mjs";

test(`[${VARIANT}] A opens HappyBot on Test Person A -> logout without reload -> B opens general chat: nothing of A in state or request`, async () => {
  const browser = createBrowser();
  try {
    await browser.signIn("A");
    const tab = await browser.newTab();
    const personA = USERS.A.people[0];
    // 1. A opens HappyBot from the profile of Test Person A, with a gift request and an initial prompt.
    await tab.setScope({ type: "person", personId: personA.id });
    await tab.setGift({ personId: personA.id, eventId: "event-A-birthday" });
    await tab.setPrompt("ПРОМПТ-А-початковий");
    await tab.open();
    await tab.settle(400); // the initial prompt is auto-submitted for A
    assert.ok(tab.requests.length >= 1, "precondition: A's request was sent");
    assert.equal(tab.pageState().scope.type, "person");
    assert.ok(tab.pageState().gift);

    // 2. logout without a full reload, 3. B signs in.
    await browser.signOut();
    await browser.signIn("B");

    // State of the page: back to a neutral general chat.
    const state = tab.pageState();
    assert.equal(JSON.stringify(state.scope), JSON.stringify({ type: "global" }), "scope reset to general"); // jsdom realm: compare as JSON
    assert.equal(state.gift, null, "giftRequest cleared");
    assert.equal(state.prompt, null, "initial prompt cleared");
    assert.equal(state.open, false, "sheet closed");

    // 4. B opens HappyBot in the general context and writes.
    const before = tab.requests.length;
    await tab.open();
    assert.ok(!tab.text().includes("ПРОМПТ-А"), "A's prompt is not on screen");
    assert.equal(tab.hasPrivateChip(), false, "no link to Test Person A");
    await tab.send("Привіт, це Б");
    const request = tab.requests[before];
    assert.ok(request, "B's request was sent");

    // 5. B's API request carries nothing of A.
    assert.match(request.authorization, /token-B/);
    assert.deepEqual(request.body.scope, { type: "global" });
    assert.equal(request.body.conversation.length, 0);
    const serialized = JSON.stringify(request.body);
    assert.ok(!serialized.includes(personA.id), "no personId of A");
    assert.ok(!serialized.includes("event-A-birthday"), "no giftRequest of A");
    assert.ok(!serialized.includes("ПРОМПТ-А"), "no initial prompt of A");
    assert.equal(request.body.context?.giftRequest ?? null, null);
    assert.equal(request.body.context?.activePersonId ?? null, null);
  } finally { closeBrowser(browser); }
});

test(`[${VARIANT}] a token refresh of the same user does not reset the page chat inputs`, async () => {
  const browser = createBrowser();
  try {
    await browser.signIn("A");
    const tab = await browser.newTab();
    await tab.setScope({ type: "person", personId: USERS.A.people[0].id });
    await tab.open();
    await browser.refreshToken();
    assert.equal(tab.pageState().scope.type, "person");
    assert.equal(tab.pageState().open, true);
  } finally { closeBrowser(browser); }
});
