// HD-CHAT-002 Phase 1B: the embedded HappyBot on the home page (greeting + reply field) hands a message to
// the same root-level HappyBot, which opens over the page; Back closes it; scroll is restored.
// Real WellbeingCheckIn + HappyBotProvider + ChatAssistantModal in jsdom; fake auth/Supabase/AI (no paid call).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeBrowser, createBrowser } from "./helpers/chat-harness/harness.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function withTab(fn, tabOptions = {}) {
  const browser = createBrowser("provider");
  try {
    await browser.signIn("A");
    const tab = await browser.newTab(tabOptions);
    await tab.settle(150);
    await fn(tab, browser);
  } finally { closeBrowser(browser); }
}

test("embedded block shows a personal greeting and a real reply field, and makes no AI request on load", () => withTab(async (tab) => {
  assert.ok(tab.embeddedInput(), "reply field is present (not a card or an 'open chat' button)");
  assert.match(tab.text(), /Привіт, Тест/, "personal greeting from structured data");
  assert.match(tab.text(), /aiNotice/, "unobtrusive AI-usage notice is rendered");
  assert.equal(tab.requests.length, 0, "no /api/ai-chat request on mount");
  assert.equal(tab.dialogCount(), 0, "chat sheet is not open");
}));

test("sending from the embedded field opens the same HappyBot over the page with exactly one request", () => withTab(async (tab) => {
  await tab.typeEmbedded("Допоможи вибрати подарунок мамі");
  assert.equal(tab.requests.length, 1, "one message = one request");
  assert.equal(tab.requests[0].body.message, "Допоможи вибрати подарунок мамі");
  assert.deepEqual(JSON.parse(JSON.stringify(tab.requests[0].body.scope)), { type: "global" });
  assert.equal(tab.requests[0].body.conversation.length, 0);
  assert.equal(tab.dialogCount(), 1, "sheet opened");
  assert.match(tab.text(), /PAGE-CONTENT/, "the home page is still mounted underneath");
  const occurrences = tab.text().split("Допоможи вибрати подарунок мамі").length - 1;
  assert.equal(occurrences, 1, "the message is shown once");
}));

test("the send button works too, and a blank message sends nothing", () => withTab(async (tab) => {
  await tab.typeEmbedded("   ", { submit: "button" });
  await tab.typeEmbedded("   ");
  assert.equal(tab.requests.length, 0);
  assert.equal(tab.dialogCount(), 0);
  await tab.typeEmbedded("Привіт", { submit: "button" });
  assert.equal(tab.requests.length, 1);
  assert.equal(tab.dialogCount(), 1);
}));

test("closing and re-opening keeps one history without duplicates; a second embedded message continues the same conversation", () => withTab(async (tab) => {
  await tab.typeEmbedded("Перше повідомлення");
  assert.match(tab.text(), /ВІДПОВІДЬ-HAPPY/);
  await tab.closeBot();
  assert.equal(tab.dialogCount(), 0, "back on the dashboard");
  await tab.openBot();
  assert.equal(tab.text().split("Перше повідомлення").length - 1, 1, "no duplicate after re-open");
  assert.equal(tab.requests.length, 1, "re-open sends nothing");
  await tab.closeBot();
  await tab.typeEmbedded("Друге повідомлення");
  assert.equal(tab.requests.length, 2);
  assert.equal(tab.requests[1].body.conversation.length, 2, "same instance: the first turn is the context of the second");
  assert.match(tab.text(), /Перше повідомлення/);
  assert.match(tab.text(), /Друге повідомлення/);
}));

test("with wellbeing consent a free-text reply is a chat message: one request, no wellbeing or support writes", () => withTab(async (tab) => {
  await tab.settle(1800); // the consenting block types its greeting progressively
  assert.ok(!tab.text().includes("Увімкнути турботу"), "consent branch: no 'enable care' button");
  assert.ok(tab.embeddedInput() && !tab.embeddedInput().disabled, "reply field is usable");
  await tab.typeEmbedded("Мені сьогодні важко");
  assert.equal(tab.requests.length, 1);
  assert.equal(tab.dialogCount(), 1);
  const wellbeingWrites = tab.writes().filter((write) => /wellbeing|support_moments/.test(write.table));
  assert.deepEqual(wellbeingWrites, [], "free text is never copied into wellbeing tables");
}, { db: { profiles: { single: { wellbeing_personalization_enabled: true } }, user_wellbeing_checkins: { list: [] } } }));

test("without consent no check-in or consent write happens when replying", () => withTab(async (tab) => {
  assert.ok(tab.text().includes("Увімкнути турботу"), "no-consent branch: 'enable care' is offered");
  await tab.typeEmbedded("Привіт, Happy");
  assert.equal(tab.requests.length, 1);
  assert.deepEqual(tab.writes(), []);
}));

test("browser Back closes the sheet and stays on the page; repeated open/close/Back cycles stay consistent", () => withTab(async (tab) => {
  const w = tab.window;
  await tab.typeEmbedded("Привіт");
  assert.equal(tab.dialogCount(), 1);
  assert.equal(w.history.state?.hdHappyBotSheet, true, "one history entry was pushed for the sheet");
  await tab.historyBack();
  assert.equal(tab.dialogCount(), 0, "Back closed the sheet");
  assert.match(tab.text(), /PAGE-CONTENT/, "still on the home page");
  assert.ok(!w.history.state?.hdHappyBotSheet);
  assert.equal(tab.requests.length, 1, "closing sends nothing");

  await tab.openBot();
  assert.equal(tab.dialogCount(), 1);
  assert.equal(w.history.state?.hdHappyBotSheet, true);
  await tab.closeBot();
  assert.equal(tab.dialogCount(), 0);
  assert.ok(!w.history.state?.hdHappyBotSheet, "closing with the X pops the entry that opening pushed");

  await tab.openBot();
  await tab.historyBack();
  assert.equal(tab.dialogCount(), 0, "Back still works on the third cycle");
  assert.equal(tab.requests.length, 1);
}));

function trackScroll(w, initial) {
  const state = { y: initial, calls: [] };
  Object.defineProperty(w, "scrollY", { configurable: true, get: () => state.y });
  w.scrollTo = (x, y) => { state.calls.push([x, y]); state.y = y; };
  return state;
}

test("closing restores the page scroll position if the browser moved it", () => withTab(async (tab) => {
  const scroll = trackScroll(tab.window, 420);
  await tab.typeEmbedded("Привіт");
  scroll.y = 0; // e.g. a mobile browser resetting the page while body scrolling is locked
  await tab.closeBot();
  await tab.settle(150);
  assert.deepEqual(scroll.calls.at(-1), [0, 420]);
}));

test("scroll is left alone when it did not move, and is not restored on another route", () => withTab(async (tab) => {
  const scroll = trackScroll(tab.window, 300);
  await tab.typeEmbedded("Привіт");
  await tab.closeBot();
  await tab.settle(150);
  assert.deepEqual(scroll.calls, [], "unchanged position: no scrollTo");

  await tab.openBot();
  scroll.y = 0;
  tab.window.history.pushState(null, "", "/people/some-person");
  await tab.navigate("/people/some-person");
  await tab.settle(150);
  assert.deepEqual(scroll.calls, [], "different route: not restored");
}));

test("the AI-usage notice exists in all five locales and the reply field is wired to the one HappyBot", async () => {
  const notices = new Set();
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const messages = JSON.parse(await readFile(path.join(root, `messages/${locale}/home.json`), "utf8"));
    const notice = messages.wellbeing.aiNotice;
    assert.ok(typeof notice === "string" && notice.length > 20, `${locale} notice`);
    notices.add(notice);
  }
  assert.equal(notices.size, 5, "every locale has its own wording");
  const checkIn = await readFile(path.join(root, "src/components/home-dashboard/WellbeingCheckIn.tsx"), "utf8");
  assert.match(checkIn, /onSendToHappy\(value\)/);
  assert.match(checkIn, /wellbeingT\("aiNotice"\)/);
  const home = await readFile(path.join(root, "src/components/HomePageClient.tsx"), "utf8");
  assert.match(home, /onSendToHappy=\{\(text\) => openHappyBot\(\{ initialPrompt: text \}\)\}/);
  const provider = await readFile(path.join(root, "src/components/happybot/HappyBotProvider.tsx"), "utf8");
  assert.match(provider, /useSheetNavigation/);
});
