import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { detectWellbeingPattern, isSupportMomentCoolingDown } from "../src/lib/wellbeing/supportPattern.ts";

test("wellbeing pattern uses one latest check-in per local calendar day", () => {
  const checkins = [
    { mood: "low", created_at: "2026-09-20T20:00:00Z" },
    { mood: "good", created_at: "2026-09-20T08:00:00Z" },
    { mood: "low", created_at: "2026-09-19T12:00:00Z" },
    { mood: "low", created_at: "2026-09-18T12:00:00Z" },
    { mood: "low", created_at: "2026-09-17T12:00:00Z" },
  ];
  assert.deepEqual(detectWellbeingPattern(checkins, "UTC"), {
    lowDaysInWindow: 4,
    consecutiveLowDays: 4,
    needsSupport: true,
  });
});

test("a non-low day interrupts the support streak", () => {
  const result = detectWellbeingPattern([
    { mood: "low", created_at: "2026-09-20T12:00:00Z" },
    { mood: "neutral", created_at: "2026-09-19T12:00:00Z" },
    { mood: "low", created_at: "2026-09-18T12:00:00Z" },
  ], "Europe/Warsaw");
  assert.equal(result.consecutiveLowDays, 1);
  assert.equal(result.needsSupport, false);
});

test("missing calendar days interrupt the support streak", () => {
  const result = detectWellbeingPattern([
    { mood: "low", created_at: "2026-09-20T12:00:00Z" },
    { mood: "low", created_at: "2026-09-19T12:00:00Z" },
    { mood: "low", created_at: "2026-09-17T12:00:00Z" },
    { mood: "low", created_at: "2026-09-15T12:00:00Z" },
  ], "UTC");
  assert.equal(result.consecutiveLowDays, 2);
  assert.equal(result.needsSupport, false);
});

test("support moment cooldown is bounded by creation time", () => {
  const now = new Date("2026-09-20T12:00:00Z");
  assert.equal(isSupportMomentCoolingDown([{ created_at: "2026-09-01T12:00:00Z" }], now, 21), true);
  assert.equal(isSupportMomentCoolingDown([{ created_at: "2026-08-20T12:00:00Z" }], now, 21), false);
});

test("support moments migration is owner-scoped and versioned", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260920144944_add_wellbeing_support_moments.sql", import.meta.url), "utf8");
  assert.match(sql, /user_support_moments enable row level security/);
  assert.match(sql, /for select to authenticated[\s\S]*auth\.uid\(\).*user_id/);
  assert.match(sql, /for insert to authenticated[\s\S]*with check[\s\S]*auth\.uid\(\).*user_id/);
  assert.match(sql, /for update to authenticated[\s\S]*using[\s\S]*with check/);
  assert.match(sql, /schema_version smallint not null default 1/);
});
