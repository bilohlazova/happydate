import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Calendar page delegates Event CRUD to the canonical repository", async () => {
  const page = await readFile(new URL("../src/app/(app)/dashboard/page.tsx", import.meta.url), "utf8");
  for (const method of [
    "listCalendarEvents",
    "createCalendarEvent",
    "updateCalendarEvent",
    "deleteCalendarEvent",
    "importCalendarEvents",
  ]) assert.match(page, new RegExp(`\\b${method}\\b`));

  assert.doesNotMatch(page, /\.from\("events"\)/);
  assert.match(page, /mergeEvents\(\[created\]\)/);
  assert.match(page, /mergeEvents\(\[updated\]\)/);
  assert.match(page, /mergeEvents\(imported\)/);
  assert.match(page, /current\.filter\(\(event\) => event\.id !== ev\.id\)/);
});

test("Calendar Event mutations are explicitly owner-scoped and return persisted rows", async () => {
  const repository = await readFile(
    new URL("../src/lib/repositories/events/events.repository.ts", import.meta.url),
    "utf8",
  );
  assert.match(repository, /const CALENDAR_EVENT_COLUMNS = "id,title,date,time_of_day,duration_minutes,location,travel_buffer_minutes,notes,category,person_id,person_name,is_important,recurrence_rule"/);
  assert.match(repository, /time_of_day: input\.timeOfDay \?\? null/);
  assert.match(repository, /duration_minutes: input\.durationMinutes \?\? null/);
  assert.match(repository, /location: input\.location \?\? null/);
  assert.match(repository, /travel_buffer_minutes: input\.travelBufferMinutes \?\? null/);
  assert.match(repository, /listCalendarEvents[\s\S]*\.eq\("user_id", userId\)/);
  assert.match(repository, /updateCalendarEvent[\s\S]*\.eq\("id", input\.eventId\)[\s\S]*\.eq\("user_id", input\.userId\)/);
  assert.match(repository, /deleteCalendarEvent[\s\S]*\.eq\("id", eventId\)\.eq\("user_id", userId\)/);
  assert.match(repository, /createCalendarEvent[\s\S]*\.select\(CALENDAR_EVENT_COLUMNS\)[\s\S]*\.single\(\)/);
  assert.match(repository, /importCalendarEvents[\s\S]*\.select\(CALENDAR_EVENT_COLUMNS\)/);
});

test("Calendar recurrence is persisted, expanded for presentation, and never applied to birthdays", async () => {
  const [page, repository, migration] = await Promise.all([
    readFile(new URL("../src/app/(app)/dashboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/repositories/events/events.repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260806183837_add_event_recurrence.sql", import.meta.url), "utf8"),
  ]);
  assert.match(page, /expandCalendarEventOccurrences/);
  assert.match(page, /mCat === "birthday" \? "none" : mRecurrenceRule/);
  assert.match(page, /persistedBirthdays/);
  assert.match(repository, /recurrence_rule: input\.recurrenceRule \?\? "none"/);
  assert.match(migration, /recurrence_rule in \('none', 'weekly', 'monthly', 'yearly'\)/);
  assert.match(migration, /grant select, insert, update, delete on table public\.events to authenticated/);
});

test("clicking a calendar date still opens its day flow and pre-fills quick creation", async () => {
  const page = await readFile(new URL("../src/app/(app)/dashboard/page.tsx", import.meta.url), "utf8");
  assert.match(page, /onSelectDate=\{handleSelectDate\}/);
  assert.match(page, /onAdd=\{\(ymd_\) => \{[\s\S]*openAdd\(ymd_\)/);
  assert.match(page, /const d = ymd_ \?\? todayYMD\(\);[\s\S]*setMDate\(d\)/);
});

test("the mobile Dashboard calendar is the only Calendar UI implementation", async () => {
  const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");
  const layout = await readFile(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(packageJson, /react-big-calendar/);
  assert.doesNotMatch(layout, /react-big-calendar/);
});

test("calendar create and edit persist an owner-validated person association", async () => {
  const [page, repository] = await Promise.all([
    readFile(new URL("../src/app/(app)/dashboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/repositories/events/events.repository.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /personId=\{mPersonId\}/);
  assert.match(page, /personId=\{ePersonId\}/);
  assert.match(page, /people\.find\(\(person\) => person\.id === mPersonId\)\?\.name/);
  assert.match(page, /people\.find\(\(person\) => person\.id === ePersonId\)\?\.name/);
  assert.match(page, /mapRealtimeEvent/);
  assert.match(repository, /person_id: input\.personId \?\? null/);
  assert.match(repository, /person_name: input\.personName \?\? null/);
  assert.match(repository, /is_important: input\.isImportant \?\? false/);
  assert.match(repository, /updateCalendarEvent[\s\S]*\.eq\("user_id", input\.userId\)/);
});

test("important Calendar events reconcile the persistent reminder lifecycle", async () => {
  const [page, reminderRepository, bridge] = await Promise.all([
    readFile(new URL("../src/app/(app)/dashboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/repositories/reminders/reminders.repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/reminders/calendarEventReminder.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /role="switch"/);
  assert.match(page, /reconcileCalendarEventReminder/);
  assert.match(reminderRepository, /activateReminderForOccurrence/);
  assert.match(reminderRepository, /cancelActiveRemindersForEvent/);
  assert.match(bridge, /cancelActiveRemindersForEvent[\s\S]*if \(!input\.enabled\) return[\s\S]*activateReminderForOccurrence/);
});
