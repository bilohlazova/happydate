import assert from "node:assert/strict";
import test from "node:test";

import {
  cancelReminder,
  completeReminder,
  ReminderTransitionError,
  reopenReminder,
  snoozeReminder,
} from "../src/lib/reminders/reminderLifecycle.ts";

const pending = Object.freeze({
  state: "pending",
  nextRemindAt: "2026-08-04T08:00:00.000Z",
  snoozedUntil: null,
  completedAt: null,
  cancelledAt: null,
});

test("completion is explicit, terminal for delivery, idempotent, and input-immutable", () => {
  const completed = completeReminder(pending, "2026-08-04T09:00:00Z");
  assert.deepEqual(completed, {
    state: "completed",
    nextRemindAt: null,
    snoozedUntil: null,
    completedAt: "2026-08-04T09:00:00.000Z",
    cancelledAt: null,
  });
  assert.deepEqual(completeReminder(completed, "2026-08-05T09:00:00Z"), completed);
  assert.equal(pending.state, "pending");
});

test("snooze schedules the next reminder and rejects past or terminal transitions", () => {
  const snoozed = snoozeReminder(
    pending,
    "2026-08-04T12:00:00Z",
    "2026-08-04T10:00:00Z",
  );
  assert.equal(snoozed.state, "snoozed");
  assert.equal(snoozed.nextRemindAt, "2026-08-04T12:00:00.000Z");
  assert.equal(snoozed.snoozedUntil, snoozed.nextRemindAt);
  assert.throws(
    () => snoozeReminder(pending, "2026-08-04T09:00:00Z", "2026-08-04T10:00:00Z"),
    ReminderTransitionError,
  );
  assert.throws(
    () => snoozeReminder(completeReminder(pending, new Date()), new Date(Date.now() + 60_000), new Date()),
    /completed reminder cannot be snoozed/,
  );
});

test("undo reopens only a completed occurrence and cancellation remains distinct", () => {
  const completed = completeReminder(pending, "2026-08-04T09:00:00Z");
  const reopened = reopenReminder(completed, "2026-08-04T10:00:00Z");
  assert.deepEqual(reopened, {
    state: "pending",
    nextRemindAt: "2026-08-04T10:00:00.000Z",
    snoozedUntil: null,
    completedAt: null,
    cancelledAt: null,
  });
  assert.throws(() => reopenReminder(pending, new Date()), /Only a completed reminder/);

  const cancelled = cancelReminder(pending, "2026-08-04T11:00:00Z");
  assert.equal(cancelled.state, "cancelled");
  assert.equal(cancelled.cancelledAt, "2026-08-04T11:00:00.000Z");
  assert.throws(() => completeReminder(cancelled, new Date()), /cancelled reminder cannot be completed/);
});

