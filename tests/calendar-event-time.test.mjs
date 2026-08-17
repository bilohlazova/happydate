import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Calendar keeps event time optional from database through UI and ICS", async () => {
  const [migration, repository, page] = await Promise.all([
    read("supabase/migrations/20260816142922_add_optional_event_time.sql"),
    read("src/lib/repositories/events/events.repository.ts"),
    read("src/app/(app)/dashboard/page.tsx"),
  ]);

  assert.match(migration, /time_of_day time without time zone/);
  assert.doesNotMatch(migration, /not null/);
  assert.match(repository, /time_of_day: input\.timeOfDay \?\? null/);
  assert.match(page, /type="time"/);
  assert.match(page, /timeOfDay: mTimeOfDay \|\| null/);
  assert.match(page, /DTSTART:\$\{dt\}T/);
  assert.match(page, /timeOfDay: time \?/);
});

test("Assistant receives only verified optional HH:mm event time", async () => {
  const [contract, verified] = await Promise.all([
    read("src/lib/assistant/chatContract.ts"),
    read("src/lib/assistant/verifiedAssistantContext.server.ts"),
  ]);

  assert.match(contract, /\^\(\[01\]\\d\|2\[0-3\]\):\[0-5\]\\d\$/);
  assert.match(contract, /event\.timeOfDay \? ` \$\{event\.timeOfDay\}` : ""/);
  assert.match(verified, /timeOfDay: event\.timeOfDay/);
  assert.match(verified, /first\.timeOfDay \?\? "99:99"/);
});
