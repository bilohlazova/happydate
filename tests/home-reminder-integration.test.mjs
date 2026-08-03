import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("Home reminder bridge canonicalizes synthetic birthdays before persistence", async () => {
  const source = await readFile(path.join(root, "src/lib/reminders/homeReminderActions.ts"), "utf8");
  assert.match(source, /event\.source === "birthday"/);
  assert.match(source, /ensureBirthdayOccurrence/);
  assert.match(source, /ensureReminderForOccurrence/);
  assert.match(source, /occurrenceDate: event\.date/);
});

test("birthday occurrence identity supports idempotent PostgREST onConflict", async () => {
  const migration = await readFile(
    path.join(root, "supabase/migrations/20260803185603_canonical_birthday_event_occurrence.sql"),
    "utf8",
  );
  const repository = await readFile(
    path.join(root, "src/lib/repositories/events/events.repository.ts"),
    "utf8",
  );
  assert.match(migration, /unique index events_user_person_date_category_uidx[\s\S]*?\(user_id, person_id, date, category\)/i);
  assert.doesNotMatch(migration, /where user_id/i);
  assert.match(repository, /onConflict: "user_id,person_id,date,category"/);
  assert.match(repository, /ignoreDuplicates: true/);
});

test("Home exposes complete, snooze, undo and person-aware gift actions", async () => {
  const home = await readFile(path.join(root, "src/components/HomePageClient.tsx"), "utf8");
  const card = await readFile(path.join(root, "src/components/home-dashboard/ReminderActions.tsx"), "utf8");
  assert.match(home, /markReminderCompleted/);
  assert.match(home, /postponeReminder/);
  assert.match(home, /undoReminderCompletion/);
  assert.match(home, /pickGiftPrompt/);
  assert.match(card, /eventIsToday/);
  assert.match(card, /onPickGift/);
});
