import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { buildDayPlanDraft, findDayPlanConflicts, isValidDayPlanItemWithinWindow, isValidEventDuration, isValidEventTime, reflowDayPlanDraft, reorderDayPlanDraft, resizeDayPlanDraft, selectDayPlanCandidates, summarizeDayPlanDraft } from "../src/lib/events/dayPlanDraft.ts";

test("day plan drafts are deterministic, ordered and never exceed the local day", () => {
  const events = [{ id: "one", title: "One", durationMinutes: 30 }, { id: "two", title: "Two" }, { id: "three", title: "Three", durationMinutes: 90 }];
  assert.deepEqual(buildDayPlanDraft(events, "09:00", 15, 60), [
    { eventId: "one", title: "One", timeOfDay: "09:00", durationMinutes: 30 },
    { eventId: "two", title: "Two", timeOfDay: "09:45", durationMinutes: 60 },
    { eventId: "three", title: "Three", timeOfDay: "11:00", durationMinutes: 90 },
  ]);
  assert.equal(buildDayPlanDraft(events, "23:00", 15, 60), null);
  assert.equal(buildDayPlanDraft(events, "not-time", 15, 60), null);
  assert.equal(buildDayPlanDraft(events, "09:00", -1, 60), null);
  assert.equal(buildDayPlanDraft(events, "09:00", 0, 4), null);
  assert.equal(isValidEventTime("23:59"), true);
  assert.equal(isValidEventTime("24:00"), false);
  assert.equal(isValidEventDuration(5), true);
  assert.equal(isValidEventDuration(1441), false);
  assert.equal(isValidDayPlanItemWithinWindow({ timeOfDay: "17:00", durationMinutes: 60 }, "09:00", "18:00"), true);
  assert.equal(isValidDayPlanItemWithinWindow({ timeOfDay: "17:30", durationMinutes: 60 }, "09:00", "18:00"), false);
  assert.equal(buildDayPlanDraft(events, "09:00", 15, 60, [], "10:00"), null);
});

test("candidate selection prioritizes important work stably and reports every deferred task", () => {
  const events = Array.from({ length: 12 }, (_, index) => ({ id: String(index), isImportant: index === 3 || index === 11 }));
  const result = selectDayPlanCandidates(events, 10);
  assert.deepEqual(result.selected.map((event) => event.id), ["3", "11", "0", "1", "2", "4", "5", "6", "7", "8"]);
  assert.deepEqual(result.deferred.map((event) => event.id), ["9", "10"]);
  assert.deepEqual(events.map((event) => event.id), Array.from({ length: 12 }, (_, index) => String(index)));
  assert.deepEqual(selectDayPlanCandidates(events, 0), { selected: [], deferred: events });
});

test("day plan summary reports workload and true finish without counting gaps as focus", () => {
  assert.deepEqual(summarizeDayPlanDraft([
    { eventId: "one", title: "One", timeOfDay: "09:00", durationMinutes: 30 },
    { eventId: "two", title: "Two", timeOfDay: "10:15", durationMinutes: 45 },
  ]), { taskCount: 2, focusMinutes: 75, travelMinutes: 0, startTime: "09:00", finishTime: "11:00" });
  assert.deepEqual(summarizeDayPlanDraft([
    { eventId: "late", title: "Late", timeOfDay: "23:30", durationMinutes: 30 },
  ]), { taskCount: 1, focusMinutes: 30, travelMinutes: 0, startTime: "23:30", finishTime: "24:00" });
  assert.equal(summarizeDayPlanDraft([]), null);
  assert.equal(summarizeDayPlanDraft([{ eventId: "bad", title: "Bad", timeOfDay: "23:45", durationMinutes: 30 }]), null);
});

test("excluding a task reflows only the remaining draft and can restore it without losing duration", () => {
  const draft = [
    { eventId: "one", title: "One", timeOfDay: "09:00", durationMinutes: 30 },
    { eventId: "two", title: "Two", timeOfDay: "09:45", durationMinutes: 75 },
    { eventId: "three", title: "Three", timeOfDay: "11:15", durationMinutes: 45 },
  ];
  const removed = draft[1];
  const remaining = reflowDayPlanDraft(draft.filter((item) => item.eventId !== removed.eventId), "09:00", 15, [], "18:00");
  assert.deepEqual(remaining, [
    { eventId: "one", title: "One", timeOfDay: "09:00", durationMinutes: 30 },
    { eventId: "three", title: "Three", timeOfDay: "09:45", durationMinutes: 45 },
  ]);
  assert.deepEqual(reflowDayPlanDraft([...remaining, removed], "09:00", 15, [], "18:00"), [
    { eventId: "one", title: "One", timeOfDay: "09:00", durationMinutes: 30 },
    { eventId: "three", title: "Three", timeOfDay: "09:45", durationMinutes: 45 },
    { eventId: "two", title: "Two", timeOfDay: "10:45", durationMinutes: 75 },
  ]);
});

test("reordering keeps confirmed durations and recalculates every start around fixed time", () => {
  const draft = [
    { eventId: "one", title: "One", timeOfDay: "09:00", durationMinutes: 30 },
    { eventId: "two", title: "Two", timeOfDay: "09:45", durationMinutes: 60 },
    { eventId: "three", title: "Three", timeOfDay: "11:00", durationMinutes: 45 },
  ];
  const fixed = [{ id: "meeting", title: "Meeting", timeOfDay: "09:30", durationMinutes: 30 }];
  assert.deepEqual(reorderDayPlanDraft(draft, "two", "up", "09:00", 15, fixed, "18:00"), [
    { eventId: "two", title: "Two", timeOfDay: "10:15", durationMinutes: 60 },
    { eventId: "one", title: "One", timeOfDay: "11:30", durationMinutes: 30 },
    { eventId: "three", title: "Three", timeOfDay: "12:15", durationMinutes: 45 },
  ]);
  assert.equal(reorderDayPlanDraft(draft, "one", "up", "09:00", 15, fixed, "18:00"), null);
  assert.equal(reorderDayPlanDraft(draft, "missing", "down", "09:00", 15, fixed, "18:00"), null);
});

test("changing one duration safely reflows every following task around fixed events", () => {
  const draft = [
    { eventId: "one", title: "One", timeOfDay: "09:00", durationMinutes: 30 },
    { eventId: "two", title: "Two", timeOfDay: "09:45", durationMinutes: 30 },
  ];
  const fixed = [{ id: "meeting", title: "Meeting", timeOfDay: "10:00", durationMinutes: 30 }];
  assert.deepEqual(resizeDayPlanDraft(draft, "one", 60, "09:00", 15, fixed, "13:00"), [
    { eventId: "one", title: "One", timeOfDay: "09:00", durationMinutes: 60 },
    { eventId: "two", title: "Two", timeOfDay: "10:45", durationMinutes: 30 },
  ]);
  assert.equal(resizeDayPlanDraft(draft, "one", 60, "09:00", 15, fixed, "11:00"), null);
  assert.equal(resizeDayPlanDraft(draft, "missing", 30, "09:00", 15, [], "18:00"), null);
  assert.equal(resizeDayPlanDraft(draft, "one", 4, "09:00", 15, [], "18:00"), null);
  assert.equal(draft[0].durationMinutes, 30);
});

test("day plan moves drafts around confirmed fixed events and detects manual overlaps", () => {
  const events = [{ id: "call", title: "Call", durationMinutes: 30 }, { id: "walk", title: "Walk", durationMinutes: 45 }];
  const fixed = [{ id: "meeting", title: "Meeting", timeOfDay: "09:15", durationMinutes: 60 }];
  assert.deepEqual(buildDayPlanDraft(events, "09:00", 15, 60, fixed), [
    { eventId: "call", title: "Call", timeOfDay: "10:30", durationMinutes: 30 },
    { eventId: "walk", title: "Walk", timeOfDay: "11:15", durationMinutes: 45 },
  ]);
  assert.deepEqual(findDayPlanConflicts([
    { eventId: "call", title: "Call", timeOfDay: "09:00", durationMinutes: 30 },
  ], fixed), [{ firstId: "call", secondId: "meeting" }]);
  assert.deepEqual(findDayPlanConflicts([
    { eventId: "one", title: "One", timeOfDay: "12:00", durationMinutes: 60 },
    { eventId: "two", title: "Two", timeOfDay: "12:30", durationMinutes: 30 },
  ]), [{ firstId: "one", secondId: "two" }]);
});

test("Assistant opens an editable Calendar-owned plan and never writes events directly", async () => {
  const [assistant, calendar] = await Promise.all([
    readFile(new URL("../src/components/ChatAssistantModal.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(app)/dashboard/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(assistant, /id: "dayPlan", icon: CalendarCheck2, destination: "\/dashboard\?action=plan-day"/);
  assert.doesNotMatch(assistant, /updateCalendarEvent|\.from\("events"\)/);
  assert.match(calendar, /action !== "add-event" && action !== "plan-day"/);
  assert.match(calendar, /if \(requestedDraft\.action === "plan-day"\) setDayPlanDate\(todayYMD\(\)\)/);
  assert.match(calendar, /await onSave\(draft, \{ startTime, endTime \}\)/);
  assert.match(calendar, /updateCalendarEvent\(/);
  assert.match(calendar, /Best-effort compensation/);
});

test("Calendar can plan a selected current or future date without mutating recurring occurrences", async () => {
  const calendar = await readFile(new URL("../src/app/(app)/dashboard/page.tsx", import.meta.url), "utf8");
  assert.match(calendar, /onPlan: \(ymd: string\) => void/);
  assert.match(calendar, /dateYMD >= today/);
  assert.match(calendar, /onClick=\{\(\) => onPlan\(dateYMD\)\}/);
  assert.match(calendar, /setDayPlanDate\(ymd_\)/);
  assert.match(calendar, /event\.date === dayPlanDate && !event\.timeOfDay && event\.category !== "birthday" && event\.recurrenceRule === "none"/);
  assert.match(calendar, /allEvents[\s\S]*event\.date === dayPlanDate && event\.timeOfDay/);
});

test("day planner copy is complete in all five product languages", async () => {
  const keys = ["draftBadge", "title", "description", "emptyTitle", "emptyDescription", "close", "planAction", "startTime", "endTime", "interval", "intervalMinutes", "defaultDuration", "gap", "rebuild", "eventTime", "eventDuration", "moveUp", "moveDown", "priorityHint", "important", "deferred", "summaryTitle", "summary", "travelSummary", "reorderHint", "exclude", "excludeShort", "restore", "restoreShort", "excludedTitle", "excludedHint", "confirmationNote", "rangeError", "validationError", "conflictError", "fixedProtected", "missingFixedDuration", "savePreferences", "savingPreferences", "preferencesSaved", "preferencesSaveError", "preferencesLoadError", "saveError", "saving", "save", "saved"];
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const messages = JSON.parse(await readFile(path.join(process.cwd(), "messages", locale, "dashboard.json"), "utf8"));
    assert.deepEqual(Object.keys(messages.dayPlan).sort(), [...keys].sort(), locale);
    for (const key of keys) assert.ok(messages.dayPlan[key].trim(), `${locale}:dayPlan.${key}`);
  }
});
