import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { canonicalGiftEventContext, persistedGiftEventIdentity } from "../src/lib/gifts/giftEventContext.ts";

const migrationUrl = new URL("../supabase/migrations/20260921120000_add_gift_event_context_key.sql", import.meta.url);
const homeRepositoryUrl = new URL("../src/lib/repositories/home/home.repository.ts", import.meta.url);

test("UUID and synthetic event contexts normalize to the same canonical Gift field", () => {
  const uuid = "00000000-0000-4000-8000-000000000001";
  const birthday = "birthday-person-1:2027-07-20";

  assert.deepEqual(persistedGiftEventIdentity(uuid), { eventId: uuid, eventContextKey: null });
  assert.equal(canonicalGiftEventContext(uuid, null), uuid);

  assert.deepEqual(persistedGiftEventIdentity(birthday), { eventId: null, eventContextKey: birthday });
  assert.equal(canonicalGiftEventContext(null, birthday), birthday);
  assert.equal(canonicalGiftEventContext(null, null), null);
});

test("Home gift-history loader uses canonical event-context normalization", async () => {
  const source = await readFile(homeRepositoryUrl, "utf8");
  assert.match(source, /canonicalGiftEventContext\(gift\.event_id, gift\.event_context_key\)/);
});

test("migration enforces one prepared gift per non-null event context and preserves multiple ideas", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  assert.match(migration, /gifts_one_prepared_uuid_event_uidx/);
  assert.match(migration, /gifts_one_prepared_synthetic_event_uidx/);
  assert.match(migration, /lifecycle in \('selected', 'purchased'\)/);
  assert.match(migration, /resolve them manually before applying this migration/);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.gifts/i);
});
