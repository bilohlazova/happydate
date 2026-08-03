import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260803190256_reminder_preferences_and_delivery_outbox.sql");
const activationMigrationPath = path.join(root, "supabase/migrations/20260803190836_activate_reminder_cron_and_in_app_delivery.sql");

test("preferences enforce timezone, quiet hours, repeat cadence and owner RLS", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /create table public\.reminder_preferences/i);
  assert.match(sql, /repeat_interval_minutes in \(60, 180, 360, 720, 1440\)/i);
  assert.match(sql, /validate_reminder_preferences_timezone/i);
  assert.match(sql, /reminder_preferences_update_own[\s\S]*?with check/i);
});

test("delivery outbox is idempotent, user-readable and service-written", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /unique \(reminder_id, channel, scheduled_for\)/i);
  assert.match(sql, /grant select on table public\.reminder_deliveries to authenticated/i);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete)[^;]*reminder_deliveries to authenticated/i);
  assert.match(sql, /queue_due_reminder_deliveries/i);
  assert.match(sql, /for update of reminder skip locked/i);
  assert.match(sql, /revoke all on function private\.queue_due_reminder_deliveries[\s\S]*?public, anon, authenticated/i);
});

test("reminder settings route persists localized user-controlled policy", async () => {
  const route = await readFile(path.join(root, "src/app/(app)/settings/reminders/page.tsx"), "utf8");
  const repository = await readFile(path.join(root, "src/lib/repositories/reminders/reminderPreferences.repository.ts"), "utf8");
  assert.match(route, /quietHoursStart/);
  assert.match(route, /repeatIntervalMinutes/);
  assert.match(repository, /Intl\.DateTimeFormat/);
  assert.match(repository, /reminder_preferences/);
});

test("cron queues due reminders without exposing the service scheduler", async () => {
  const sql = await readFile(activationMigrationPath, "utf8");
  assert.match(sql, /create extension if not exists pg_cron/i);
  assert.match(sql, /happydate-queue-reminder-deliveries/);
  assert.match(sql, /\* \* \* \* \*/);
  assert.match(sql, /private\.queue_due_reminder_deliveries\(statement_timestamp\(\), 100\)/i);
  assert.match(sql, /if not exists[\s\S]*?from cron\.job/i);
});

test("in-app delivery RPC claims only the authenticated user's queued rows", async () => {
  const sql = await readFile(activationMigrationPath, "utf8");
  assert.match(sql, /security definer[\s\S]*?set search_path = ''/i);
  assert.match(sql, /current_user_id uuid := \(select auth\.uid\(\)\)/i);
  assert.match(sql, /delivery\.user_id = current_user_id/i);
  assert.match(sql, /delivery\.channel = 'in_app'/i);
  assert.match(sql, /delivery\.status = 'queued'/i);
  assert.match(sql, /for update skip locked/i);
  assert.match(sql, /revoke all on function public\.consume_my_in_app_deliveries\(integer\)[\s\S]*?public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.consume_my_in_app_deliveries\(integer\)[\s\S]*?authenticated/i);
});

test("Home consumes queued in-app deliveries and exposes a localized notice", async () => {
  const home = await readFile(path.join(root, "src/components/HomePageClient.tsx"), "utf8");
  const dashboard = await readFile(path.join(root, "src/components/home-dashboard/HomeDashboard.tsx"), "utf8");
  const repository = await readFile(path.join(root, "src/lib/repositories/reminders/reminderDeliveries.repository.ts"), "utf8");
  assert.match(repository, /supabase\.rpc\("consume_my_in_app_deliveries"/);
  assert.match(home, /consumeQueuedInAppDeliveries\(\)/);
  assert.match(dashboard, /reminder\.deliveryReady/);
});
