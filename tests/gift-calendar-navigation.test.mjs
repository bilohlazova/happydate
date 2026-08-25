import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildGiftStartHref, isPersistedCalendarEventId } from "../src/lib/gifts/giftNavigation.ts";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("synthetic birthdays keep the person but never masquerade as persisted event UUIDs", () => {
  const href = buildGiftStartHref({
    personId: "person-1",
    eventId: "birthday-person-1",
    date: "2026-08-24",
    title: "🎂 Dima",
    category: "birthday",
    returnTo: "/dashboard?date=2026-08-24",
  });
  const url = new URL(href, "https://happydate.test");
  assert.equal(url.searchParams.get("personId"), "person-1");
  assert.equal(url.searchParams.get("occasion"), "birthday");
  assert.equal(url.searchParams.get("eventId"), null);
  assert.equal(url.searchParams.get("title"), "Dima");
});

test("persisted calendar UUIDs are preserved and unsafe return targets are ignored", () => {
  const eventId = "123e4567-e89b-42d3-a456-426614174000";
  assert.equal(isPersistedCalendarEventId(eventId), true);
  const url = new URL(buildGiftStartHref({ personId: "person-1", eventId, returnTo: "//evil.test" }), "https://happydate.test");
  assert.equal(url.searchParams.get("eventId"), eventId);
  assert.equal(url.searchParams.get("returnTo"), null);
});

test("calendar exposes an accessible gift action only with a linked person", async () => {
  const calendar = await source("src/app/(app)/dashboard/page.tsx");
  assert.match(calendar, /ev\.personId &&/);
  assert.match(calendar, /event\.personId &&/);
  assert.match(calendar, /buildGiftStartHref/);
  assert.match(calendar, /day\.giftIdea/);
  assert.match(calendar, /bg-amber-50 border-amber-200/);
  assert.match(calendar, /hd-calendar-day-event svg[^}]*color: currentColor/);
  assert.match(calendar, /className="bg-amber-400"/);
  assert.doesNotMatch(calendar, /birthday:\s*\{[^}]*bg-pink-/);
});

test("recipient context validates the event against both owner and person", async () => {
  const loaders = await source("src/lib/gifts/gift.loaders.ts");
  assert.match(loaders, /\.eq\("user_id", userId\)/);
  assert.match(loaders, /\.eq\("person_id", personId\)/);
  assert.match(loaders, /isPersistedCalendarEventId/);
});
