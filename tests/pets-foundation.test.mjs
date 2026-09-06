import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("pets use an owned many-to-many schema with RLS", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260906154551_create_pets_and_person_pets.sql", import.meta.url), "utf8");
  assert.match(sql, /create table public\.pets/);
  assert.match(sql, /create table public\.person_pets/);
  assert.match(sql, /primary key \(person_id, pet_id\)/);
  assert.match(sql, /alter table public\.pets enable row level security/);
  assert.match(sql, /alter table public\.person_pets enable row level security/);
  assert.match(sql, /people\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /pets\.user_id = \(select auth\.uid\(\)\)/);
});

test("person profile loads real pets and exposes progressive pet CRUD", async () => {
  const loader = await readFile(new URL("../src/lib/people/people.loaders.ts", import.meta.url), "utf8");
  const component = await readFile(new URL("../src/components/people/PetsSection.tsx", import.meta.url), "utf8");
  assert.match(loader, /getPetsForPerson\(userId, personId\)/);
  assert.match(component, /addPersonPet/);
  assert.match(component, /editPersonPet/);
  assert.match(component, /removePersonPet/);
  assert.doesNotMatch(component, /mock|fake/i);
});

test("Happy receives only bounded owner-scoped pet facts for the active person", async () => {
  const [loader, route, contract] = await Promise.all([
    readFile(new URL("../src/lib/assistant/petContext.server.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/ai-chat/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/assistant/chatContract.ts", import.meta.url), "utf8"),
  ]);
  assert.match(loader, /\.eq\("user_id", userId\)/);
  assert.match(loader, /\.eq\("person_id", personId\)/);
  assert.match(route, /personResolutionStatus === "resolved"/);
  assert.match(contract, /Do not infer an emotional bond or preference/);
});
