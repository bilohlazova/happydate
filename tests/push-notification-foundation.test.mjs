import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationPath = path.join(
  root,
  "supabase/migrations/20260804154538_create_push_device_registration.sql",
);

test("push device tokens are private and registration is owner-bound", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /create table public\.push_devices/i);
  assert.match(sql, /constraint push_devices_token_unique unique \(token\)/i);
  assert.match(sql, /alter table public\.push_devices enable row level security/i);
  assert.match(sql, /revoke all on table public\.push_devices from public, anon, authenticated/i);
  assert.match(sql, /current_user_id uuid := \(select auth\.uid\(\)\)/i);
  assert.match(sql, /if current_user_id is null then/i);
  assert.match(sql, /revoke all on function public\.register_my_push_device[\s\S]*?public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.register_my_push_device[\s\S]*?authenticated/i);
});

test("scheduler queues push only for opted-in users with an enabled device", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /coalesce\(preference\.push_enabled, false\) as push_enabled/i);
  assert.match(sql, /'push'::text, candidate\.push_enabled and exists/i);
  assert.match(sql, /device\.user_id = candidate\.user_id and device\.enabled/i);
  assert.match(sql, /on conflict \(reminder_id, channel, scheduled_for\) do nothing/i);
});

test("Capacitor registration is explicit and reminder settings own consent", async () => {
  const registration = await readFile(path.join(root, "src/lib/notifications/pushRegistration.ts"), "utf8");
  const settings = await readFile(path.join(root, "src/app/(app)/settings/reminders/page.tsx"), "utf8");
  const appDelegate = await readFile(path.join(root, "ios/App/App/AppDelegate.swift"), "utf8");
  assert.match(registration, /PushNotifications\.requestPermissions\(\)/);
  assert.match(registration, /registerPushDevice\(token, platform, locale\)/);
  assert.match(registration, /PushNotifications\.createChannel/);
  assert.match(settings, /value\.pushEnabled/);
  assert.match(settings, /enableNativePush\(locale\)/);
  assert.match(appDelegate, /capacitorDidRegisterForRemoteNotifications/);
});
