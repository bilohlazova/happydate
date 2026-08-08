import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("gift lifecycle and saved links have separate canonical tables", async () => {
  const migration = await source(
    "supabase/migrations/20260808094421_create_gift_lifecycle_and_saved_links.sql",
  );
  assert.match(migration, /create table public\.gifts/);
  assert.match(migration, /create table public\.gift_links/);
  assert.match(migration, /'idea', 'selected', 'purchased', 'given'/);
  assert.match(migration, /lifecycle <> 'given' or occurred_on is not null/);
  assert.match(migration, /foreign key \(gift_id, user_id, person_id\)/);
});

test("new gift tables are explicitly protected and exposed only to authenticated users", async () => {
  const migration = await source(
    "supabase/migrations/20260808094421_create_gift_lifecycle_and_saved_links.sql",
  );
  for (const table of ["gifts", "gift_links"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`));
    assert.match(migration, new RegExp(`grant select, insert, update, delete on table public\\.${table} to authenticated`));
  }
  assert.equal((migration.match(/\(select auth\.uid\(\)\) = user_id/g) ?? []).length >= 8, true);
});

test("saved external references accept only HTTPS and remain user-owned", async () => {
  const [migration, persistence] = await Promise.all([
    source("supabase/migrations/20260808094421_create_gift_lifecycle_and_saved_links.sql"),
    source("src/lib/gifts/gift.persistence.ts"),
  ]);
  assert.match(migration, /lower\(url\) ~ '\^https:\/\//);
  assert.match(persistence, /parsed\.protocol !== "https:"/);
  assert.match(persistence, /\.eq\("user_id", userId\)/);
  assert.match(persistence, /metadata is untrusted|untrusted user data/i);
});

test("Gift Repository combines canonical gifts with the legacy read bridge", async () => {
  const repository = await source("src/lib/gifts/gift.repository.ts");
  assert.match(repository, /listCanonicalGifts/);
  assert.match(repository, /listKnowledge/);
  assert.match(repository, /createCanonicalGift as createGift/);
  assert.match(repository, /setCanonicalGiftLifecycle as setGiftLifecycle/);
  assert.match(repository, /saveGiftLink/);
});
