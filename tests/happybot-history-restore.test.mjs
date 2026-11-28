// HD-CHAT-002 Phase 1C: restoring stored history into the one HappyBot (real provider, real modal, jsdom).
// Fake Supabase serves seeded `happy_chat_turns`; fake AI is local. No paid AI, no real database.
import test from "node:test";
import assert from "node:assert/strict";
import { closeBrowser, createBrowser, USERS } from "./helpers/chat-harness/harness.mjs";

const mama = USERS.A.people[0].id;
const friend = USERS.A.people[1].id;
let counter = 0;
const row = (overrides) => {
  counter += 1;
  return { id: `turn-${counter}`, user_id: "user-A", person_id: null, scope: "global", user_message: `Q${counter}`, happy_response: `A${counter}`, created_at: new Date(Date.UTC(2026, 10, 20, 10, counter)).toISOString(), ...overrides };
};
const GLOBAL = row({ user_message: "ГЛОБАЛЬНЕ-ПИТАННЯ", happy_response: "ГЛОБАЛЬНА-ВІДПОВІДЬ" });
const MAMA = row({ scope: "person", person_id: mama, user_message: "ПРО-МАМУ-ПИТАННЯ", happy_response: "ПРО-МАМУ-ВІДПОВІДЬ" });
const FRIEND = row({ scope: "person", person_id: friend, user_message: "ПРО-ДРУГА-ПИТАННЯ", happy_response: "ПРО-ДРУГА-ВІДПОВІДЬ" });
const GIFT = row({ scope: "global", person_id: mama, user_message: "ПОДАРУНОК-БЮДЖЕТ-5000", happy_response: "ПОДАРУНОК-ІДЕЯ" });
const EVENT = row({ scope: "event", person_id: mama, user_message: "ПОДІЯ-ПИТАННЯ", happy_response: "ПОДІЯ-ВІДПОВІДЬ" });
const OTHER_OWNER = row({ user_id: "user-B", user_message: "ЧУЖЕ-ПИТАННЯ-Б", happy_response: "ЧУЖА-ВІДПОВІДЬ-Б" });
const ALL = [GLOBAL, MAMA, FRIEND, GIFT, EVENT, OTHER_OWNER];

async function withTab(fn, db = { happy_chat_turns: { list: ALL } }) {
  const browser = createBrowser("provider");
  try {
    await browser.signIn("A");
    const tab = await browser.newTab({ db });
    await tab.settle(150);
    await fn(tab, browser);
  } finally { closeBrowser(browser); }
}
const historyQueries = (tab) => (tab.window.__queries ?? []).filter((query) => query.table === "happy_chat_turns");
const seen = (tab, text) => tab.text().includes(text);

test("the general chat restores only global history; person, gift, event and foreign rows stay out", () => withTab(async (tab) => {
  await tab.openBot();
  await tab.settle(200);
  assert.ok(seen(tab, "ГЛОБАЛЬНЕ-ПИТАННЯ") && seen(tab, "ГЛОБАЛЬНА-ВІДПОВІДЬ"), "own global history is restored");
  for (const text of ["ПРО-МАМУ", "ПРО-ДРУГА", "ПОДАРУНОК", "ПОДІЯ", "ЧУЖЕ", "ЧУЖА"]) assert.ok(!seen(tab, text), `${text} must not be shown`);
  assert.equal(tab.requests.length, 0, "restoring history never calls AI");
  assert.deepEqual(tab.writes(), [], "restoring history writes nothing");
}));

test("a person's chat restores only that person's own conversation", () => withTab(async (tab) => {
  await tab.openBot({ scope: { type: "person", personId: mama } });
  await tab.settle(200);
  assert.ok(seen(tab, "ПРО-МАМУ-ПИТАННЯ") && seen(tab, "ПРО-МАМУ-ВІДПОВІДЬ"));
  for (const text of ["ГЛОБАЛЬНЕ", "ПРО-ДРУГА", "ПОДАРУНОК", "ПОДІЯ", "ЧУЖЕ"]) assert.ok(!seen(tab, text), `${text} must not be shown`);
  await tab.openBot({ scope: { type: "person", personId: friend } });
  await tab.settle(200);
  assert.ok(seen(tab, "ПРО-ДРУГА-ПИТАННЯ"));
  assert.ok(!seen(tab, "ПРО-МАМУ"), "friend's chat does not show mama's history");
}));

test("defence in depth: a server that leaks other owners' or other segments' rows is not believed", () => withTab(async (tab) => {
  await tab.openBot();
  await tab.settle(200);
  assert.ok(seen(tab, "ГЛОБАЛЬНЕ-ПИТАННЯ"));
  for (const text of ["ПРО-МАМУ", "ПРО-ДРУГА", "ПОДАРУНОК", "ПОДІЯ", "ЧУЖЕ", "ЧУЖА"]) assert.ok(!seen(tab, text), `${text} must not be shown`);
}, { happy_chat_turns: { list: ALL, ignoreFilters: true } }));

test("gift, event and task conversations have no confirmable segment: nothing is read or restored", () => withTab(async (tab) => {
  await tab.openBot({ scope: { type: "person", personId: mama }, giftRequest: { personId: mama, eventId: "event-A-birthday", mode: "selection" } });
  await tab.settle(200);
  assert.equal(historyQueries(tab).length, 0, "no history query for a gift chat");
  assert.ok(!seen(tab, "ПОДАРУНОК-БЮДЖЕТ") && !seen(tab, "ПРО-МАМУ"));
  await tab.openBot({ scope: { type: "event", eventId: "00000000-0000-4000-8000-000000000010" } });
  await tab.settle(200);
  assert.equal(historyQueries(tab).length, 0, "no history query for an event chat");
  await tab.openBot({ scope: { type: "task", taskId: "00000000-0000-4000-8000-000000000020" } });
  await tab.settle(200);
  assert.equal(historyQueries(tab).length, 0, "no history query for a task chat");
}));

test("the next request carries the restored context of its own segment only; the reply is saved by the server, not here", () => withTab(async (tab) => {
  await tab.openBot();
  await tab.settle(200);
  await tab.send("Нове питання");
  assert.equal(tab.requests.length, 1);
  const { conversation } = tab.requests[0].body;
  assert.deepEqual(conversation.map((item) => item.content), ["ГЛОБАЛЬНЕ-ПИТАННЯ", "ГЛОБАЛЬНА-ВІДПОВІДЬ"]);
  const serialized = JSON.stringify(tab.requests[0].body);
  for (const text of ["ПРО-МАМУ", "ПРО-ДРУГА", "ПОДАРУНОК", "ПОДІЯ", "ЧУЖЕ"]) assert.ok(!serialized.includes(text), `${text} must not be in the payload`);
  assert.deepEqual(tab.writes(), [], "the client never writes chat history");
}));

test("an embedded reply waits for the restored history, so one message is one request with its context", () => withTab(async (tab) => {
  await tab.typeEmbedded("Продовжимо розмову");
  assert.equal(tab.requests.length, 1);
  assert.deepEqual(tab.requests[0].body.conversation.map((item) => item.content), ["ГЛОБАЛЬНЕ-ПИТАННЯ", "ГЛОБАЛЬНА-ВІДПОВІДЬ"]);
  assert.equal(tab.requests[0].body.message, "Продовжимо розмову");
  assert.equal(tab.text().split("ГЛОБАЛЬНЕ-ПИТАННЯ").length - 1, 1, "restored once");
}));

test("close, re-open and context switches neither re-read nor duplicate the history", () => withTab(async (tab) => {
  await tab.openBot();
  await tab.settle(200);
  await tab.closeBot();
  await tab.openBot();
  await tab.openBot({ scope: { type: "person", personId: mama } });
  await tab.settle(200);
  await tab.openBot();
  await tab.settle(200);
  assert.equal(tab.text().split("ГЛОБАЛЬНЕ-ПИТАННЯ").length - 1, 1, "global history shown once");
  assert.equal(historyQueries(tab).length, 2, "one read per segment instance (global, mama)");
}));

test("when the history cannot be read the chat still works and shows nothing invented", () => withTab(async (tab) => {
  await tab.openBot();
  await tab.settle(200);
  assert.ok(!seen(tab, "ГЛОБАЛЬНЕ") && !seen(tab, "Q1"));
  await tab.send("Привіт");
  assert.equal(tab.requests.length, 1);
  assert.equal(tab.requests[0].body.conversation.length, 0);
}, { happy_chat_turns: { list: ALL, error: "boom" } }));

test("an account with no stored history gets an empty chat and no claim of earlier conversations", () => withTab(async (tab) => {
  await tab.openBot();
  await tab.settle(200);
  assert.ok(!seen(tab, "ГЛОБАЛЬНЕ") && !seen(tab, "ПРО-МАМУ"));
  await tab.send("Привіт");
  assert.equal(tab.requests[0].body.conversation.length, 0);
}, { happy_chat_turns: { list: [] } }));

test("account switch: B never sees A's restored history and gets only B's own", () => withTab(async (tab, browser) => {
  await tab.openBot();
  await tab.settle(200);
  assert.ok(seen(tab, "ГЛОБАЛЬНЕ-ПИТАННЯ"));
  await browser.signOut();
  await browser.signIn("B");
  assert.equal(tab.dialogCount(), 0);
  await tab.openBot();
  await tab.settle(200);
  assert.ok(!seen(tab, "ГЛОБАЛЬНЕ-ПИТАННЯ") && !seen(tab, "ГЛОБАЛЬНА-ВІДПОВІДЬ"), "A's history is gone");
  assert.ok(seen(tab, "ЧУЖЕ-ПИТАННЯ-Б"), "B's own history is restored");
  await tab.send("Привіт від Б");
  assert.deepEqual(tab.requests.at(-1).body.conversation.map((item) => item.content), ["ЧУЖЕ-ПИТАННЯ-Б", "ЧУЖА-ВІДПОВІДЬ-Б"]);
}));

test("a slow history read holds the first request back until it settles; the request then carries that context once", () => withTab(async (tab) => {
  const input = tab.embeddedInput();
  await tab.act(async () => {
    Object.getOwnPropertyDescriptor(tab.window.HTMLInputElement.prototype, "value").set.call(input, "Швидке повідомлення");
    input.dispatchEvent(new tab.window.Event("input", { bubbles: true }));
  });
  await tab.act(async () => { input.dispatchEvent(new tab.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
  await tab.settle(450);
  assert.equal(tab.dialogCount(), 1, "the sheet is open");
  assert.equal(tab.requests.length, 0, "no request while the history is still loading");
  await tab.settle(1200);
  await tab.settle(700); // the held prompt is submitted after the history settled
  assert.equal(tab.requests.length, 1, "exactly one request once the history settled");
  assert.deepEqual(tab.requests[0].body.conversation.map((item) => item.content), ["ГЛОБАЛЬНЕ-ПИТАННЯ", "ГЛОБАЛЬНА-ВІДПОВІДЬ"]);
}, { happy_chat_turns: { list: ALL, delayMs: 700 } }));
