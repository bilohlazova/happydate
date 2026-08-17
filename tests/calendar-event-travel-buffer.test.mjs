import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildDayPlanDraft, findDayPlanConflicts, summarizeDayPlanDraft } from "../src/lib/events/dayPlanDraft.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("travel buffer is optional, bounded and persisted without new access surfaces", async () => {
  const [migration, repository, page] = await Promise.all([
    read("supabase/migrations/20260816153214_add_optional_event_travel_buffer.sql"),
    read("src/lib/repositories/events/events.repository.ts"),
    read("src/app/(app)/dashboard/page.tsx"),
  ]);
  assert.match(migration, /travel_buffer_minutes integer/);
  assert.match(migration, /between 5 and 240/);
  assert.doesNotMatch(migration, /grant|policy|security definer/i);
  assert.match(repository, /travel_buffer_minutes: input\.travelBufferMinutes \?\? null/);
  assert.match(page, /X-HAPPYDATE-TRAVEL-BUFFER/);
  assert.match(page, /isValidTravelBuffer\(Number\(travelBuffer\)\)/);
});

test("planner reserves confirmed travel before tasks and fixed appointments", () => {
  assert.deepEqual(buildDayPlanDraft([
    { id: "visit", title: "Visit", durationMinutes: 60, travelBufferMinutes: 30 },
  ], "09:00", 0, 60, [], "12:00"), [
    { eventId: "visit", title: "Visit", timeOfDay: "09:30", durationMinutes: 60, travelBufferMinutes: 30 },
  ]);
  assert.deepEqual(buildDayPlanDraft([
    { id: "task", title: "Task", durationMinutes: 30 },
  ], "09:15", 0, 60, [{ id: "visit", title: "Visit", timeOfDay: "10:00", durationMinutes: 60, travelBufferMinutes: 30 }], "12:00"), [
    { eventId: "task", title: "Task", timeOfDay: "11:00", durationMinutes: 30 },
  ]);
  assert.deepEqual(findDayPlanConflicts([
    { eventId: "task", title: "Task", timeOfDay: "09:40", durationMinutes: 20 },
  ], [{ id: "visit", title: "Visit", timeOfDay: "10:00", durationMinutes: 60, travelBufferMinutes: 30 }]), [{ firstId: "visit", secondId: "task" }]);
  assert.deepEqual(summarizeDayPlanDraft([
    { eventId: "visit", title: "Visit", timeOfDay: "09:30", durationMinutes: 60, travelBufferMinutes: 30 },
  ]), { taskCount: 1, focusMinutes: 60, travelMinutes: 30, startTime: "09:30", finishTime: "10:30" });
});

test("travel buffer copy exists in all five product languages", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const [dashboard, home] = await Promise.all([
      read(`messages/${locale}/dashboard.json`).then(JSON.parse),
      read(`messages/${locale}/home.json`).then(JSON.parse),
    ]);
    for (const value of [dashboard.form.travelBuffer, dashboard.form.travelBufferPlaceholder, dashboard.validation.travelBuffer, dashboard.day.travelBuffer, dashboard.dayPlan.travelSummary, home.brief.eventWithTravelBuffer]) {
      assert.ok(value.trim(), locale);
    }
  }
});
