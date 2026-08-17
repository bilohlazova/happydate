import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("event location stays optional and bounded from database through Calendar and ICS", async () => {
  const [migration, repository, page] = await Promise.all([
    read("supabase/migrations/20260816152306_add_optional_event_location.sql"),
    read("src/lib/repositories/events/events.repository.ts"),
    read("src/app/(app)/dashboard/page.tsx"),
  ]);
  assert.match(migration, /add column if not exists location text/);
  assert.match(migration, /char_length\(location\) between 1 and 300/);
  assert.doesNotMatch(migration, /location text not null/);
  assert.match(repository, /location: input\.location \?\? null/);
  assert.match(repository, /duration_minutes,location,travel_buffer_minutes,notes/);
  assert.match(page, /maxLength=\{300\}/);
  assert.match(page, /LOCATION:\$\{escICS\(e\.location\)\}/);
  assert.match(page, /get\(\/LOCATION:\(\.\+\)\/\)\?\.slice\(0, 300\)/);
});

test("Assistant receives only owner-scoped bounded event locations", async () => {
  const [contract, verified, homeRepository] = await Promise.all([
    read("src/lib/assistant/chatContract.ts"),
    read("src/lib/assistant/verifiedAssistantContext.server.ts"),
    read("src/lib/repositories/home/home.repository.ts"),
  ]);
  assert.match(contract, /eventLocationLength: 300/);
  assert.match(contract, /confirmed location:/);
  assert.match(verified, /event\.location\?\.trim\(\)\.slice\(0, ASSISTANT_CHAT_LIMITS\.eventLocationLength\)/);
  assert.match(homeRepository, /\.eq\("user_id", userId\)/);
  assert.match(homeRepository, /duration_minutes, location, travel_buffer_minutes, category/);
});

test("all product locales explain the optional location field and its boundary", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const messages = JSON.parse(await read(`messages/${locale}/dashboard.json`));
    assert.ok(messages.form.location.trim(), locale);
    assert.ok(messages.form.locationPlaceholder.trim(), locale);
    assert.ok(messages.validation.location.trim(), locale);
  }
});
