import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { applyInboxReadMutation, markInboxPageFailure, mergeInboxPage, selectRenderableInbox } from "../src/lib/notifications/inboxState.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const item = (id, readAt = null) => ({ id, readAt });

test("inbox render state is owner-scoped across auth transitions and stale responses", () => {
  const snapshot = { ownerId: "user-a", status: "ready", items: [item("a")], unreadCount: 1, page: 0, hasMore: true };
  assert.equal(selectRenderableInbox(snapshot, "user-a", false)?.items[0].id, "a");
  assert.equal(selectRenderableInbox(snapshot, "user-b", false), null);
  assert.equal(selectRenderableInbox(snapshot, null, false), null);
  assert.equal(selectRenderableInbox(snapshot, "user-b", true), null);
  assert.equal(selectRenderableInbox(snapshot, "user-a", true), null);
});

test("pagination appends only to the same owner and preserves server unread count", () => {
  const first = mergeInboxPage(null, "user-a", 0, [item("1"), item("2")], 2, true, false);
  const second = mergeInboxPage(first, "user-a", 1, [item("3")], 2, false, true);
  assert.deepEqual(second.items.map((entry) => entry.id), ["1", "2", "3"]);
  assert.equal(second.page, 1);
  assert.equal(second.hasMore, false);
  const wrongOwner = mergeInboxPage(first, "user-b", 1, [item("b")], 1, false, true);
  assert.deepEqual(wrongOwner.items.map((entry) => entry.id), ["b"]);
});

test("page 0 success, page 1 failure, then retry page 1 success keeps items and avoids duplicates", async () => {
  const first = mergeInboxPage(null, "user-a", 0, [item("1"), item("2")], 2, true, false);
  const failed = markInboxPageFailure(first, "user-a", 1, true, "error");
  assert.deepEqual(failed.items.map((entry) => entry.id), ["1", "2"]);
  assert.equal(failed.failedPage, 1);
  assert.equal(failed.failedAppend, true);
  const retried = mergeInboxPage(failed, "user-a", failed.failedPage, [item("3")], 2, false, failed.failedAppend);
  assert.deepEqual(retried.items.map((entry) => entry.id), ["1", "2", "3"]);
  assert.equal(retried.items.filter((entry) => entry.id === "3").length, 1);
  const unavailable = markInboxPageFailure(first, "user-a", 1, true, "unavailable");
  assert.equal(unavailable.failedPage, 1);
  assert.equal(unavailable.failedAppend, true);
  const component = await read("src/components/notifications/NotificationInbox.tsx");
  assert.match(component, /visible\?\.failedPage/);
  assert.match(component, /visible\?\.failedAppend/);
});

test("repeated read/open responses decrement unread only on the first transition", () => {
  const current = mergeInboxPage(null, "user-a", 0, [item("1")], 1, false, false);
  const read = applyInboxReadMutation(current, "1", item("1", "2026-10-21T10:00:00Z"));
  const repeated = applyInboxReadMutation(read, "1", item("1", "2026-10-21T10:00:00Z"));
  assert.equal(read.unreadCount, 0);
  assert.equal(repeated.unreadCount, 0);
});

test("inbox requests use the session bearer and distinguish server outcomes", async () => {
  const inbox = await read("src/components/notifications/NotificationInbox.tsx");
  const list = await read("src/app/api/happy/notifications/route.ts");
  assert.match(inbox, /supabase\.auth\.getSession\(\)/);
  assert.match(inbox, /Authorization: `Bearer \$\{token\}`/);
  assert.match(inbox, /response\.status === 401/);
  assert.match(inbox, /response\.status === 503/);
  assert.match(inbox, /page=\$\{page\}/);
  assert.match(list, /ownerId: identity\.userId/);
});

test("all five locale dictionaries contain the Inbox states", async () => {
  for (const locale of ["pl", "uk", "en", "de", "ru"]) {
    const dictionary = JSON.parse(await read(`messages/${locale}/navigation.json`));
    for (const key of ["loadingMore", "loadMore", "retry", "error", "unauthorized", "unavailable"]) {
      assert.equal(typeof dictionary.notifications[key], "string", `${locale}.${key}`);
    }
  }
});
