import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("notification inbox migration adds durable open state without browser writes", async () => {
  const sql = await read("supabase/migrations/20261017054630_add_happy_notification_open_state.sql");
  assert.match(sql, /add column opened_at timestamptz/i);
  assert.match(sql, /grant select on table public\.happy_notifications to service_role/i);
  assert.match(sql, /grant update \(read_at, opened_at\) on table public\.happy_notifications to service_role/i);
  assert.doesNotMatch(sql, /grant .* to authenticated/i);
  assert.doesNotMatch(sql, /grant .* to anon/i);
  assert.doesNotMatch(sql, /grant .* to public/i);
});

test("inbox routes are authenticated, body-free state transitions", async () => {
  const list = await read("src/app/api/happy/notifications/route.ts");
  const readRoute = await read("src/app/api/happy/notifications/[id]/read/route.ts");
  const openRoute = await read("src/app/api/happy/notifications/[id]/open/route.ts");
  for (const source of [list, readRoute, openRoute]) {
    assert.match(source, /getAssistantRequestIdentity/);
    assert.match(source, /identity\.kind !== "authenticated"/);
  }
  assert.match(readRoute, /await request\.text\(\)/);
  assert.match(openRoute, /await request\.text\(\)/);
  assert.match(readRoute, /markHappyNotification\(identity\.userId, id, false\)/);
  assert.match(openRoute, /markHappyNotification\(identity\.userId, id, true\)/);
});

test("notification destinations resolve through owner-scoped task/event/person fallbacks", async () => {
  const source = await read("src/lib/happy/notifications.server.ts");
  assert.match(source, /eq\("user_id", userId\)/);
  assert.match(source, /happy_tasks/);
  assert.match(source, /events/);
  assert.match(source, /people/);
  assert.match(source, /global_chat/);
  assert.match(source, /type: "task"/);
  assert.match(source, /type: "event"/);
  assert.match(source, /type: "person"/);
  assert.match(source, /type: "global"/);
});

test("read and open are notification state only, never quiet or workflow mutation", async () => {
  const source = await read("src/lib/happy/notifications.server.ts");
  assert.match(source, /update\(patch\)/);
  assert.match(source, /read_at/);
  assert.match(source, /opened_at/);
  assert.doesNotMatch(source, /happy_actions/);
  assert.doesNotMatch(source, /quiet/);
  assert.doesNotMatch(source, /dismissed_at.*update/);
});

test("header inbox and task CTA preserve the existing ChatScope boundary", async () => {
  const header = await read("src/components/Header.tsx");
  const inbox = await read("src/components/notifications/NotificationInbox.tsx");
  const home = await read("src/components/HomePageClient.tsx");
  assert.match(header, /NotificationInbox/);
  assert.match(inbox, /\/api\/happy\/notifications/);
  assert.match(inbox, /destination\.href/);
  assert.match(home, /notificationScope/);
  assert.match(home, /setChatScope\(\{ type: "task", taskId \}\)/);
});
