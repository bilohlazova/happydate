import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("event duration stays optional and bounded from database through Calendar and ICS", async () => {
  const [migration, repository, page] = await Promise.all([
    read("supabase/migrations/20260816144837_add_optional_event_duration.sql"),
    read("src/lib/repositories/events/events.repository.ts"),
    read("src/app/(app)/dashboard/page.tsx"),
  ]);
  assert.match(migration, /duration_minutes integer/);
  assert.match(migration, /between 5 and 1440/);
  assert.doesNotMatch(migration, /duration_minutes integer not null/);
  assert.match(repository, /duration_minutes: input\.durationMinutes \?\? null/);
  assert.match(page, /DURATION:PT\$\{e\.durationMinutes\}M/);
  assert.match(page, /DURATION:PT\(\[0-9\]\+\)M/);
});

test("Assistant accepts only verified, bounded event durations", async () => {
  const [contract, verified] = await Promise.all([
    read("src/lib/assistant/chatContract.ts"),
    read("src/lib/assistant/verifiedAssistantContext.server.ts"),
  ]);
  assert.match(contract, /event\.durationMinutes >= 5/);
  assert.match(contract, /confirmed duration:/);
  assert.match(verified, /durationMinutes: event\.durationMinutes/);
});
