import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Home keeps its bounded people projection while scoped chat can hydrate an owned person", async () => {
  const repository = await source("src/lib/repositories/home/home.repository.ts");
  const route = await source("src/app/api/ai-chat/route.ts");
  assert.match(repository, /\.limit\(100\)/);
  assert.match(repository, /export async function loadOwnedHomePerson\(/);
  assert.match(repository, /\.eq\("id", personId\)\s*\.eq\("user_id", userId\)\s*\.maybeSingle\(\)/);
  assert.match(route, /resolveVerifiedChatScope/);
  assert.match(route, /if \(scopedPersonId && !homeData\.people\.some/);
  assert.match(route, /await loadOwnedHomePerson\(rlsSession\.client, identity\.userId, scopedPersonId\)/);
  assert.match(route, /homeData\.people = \[\.\.\.homeData\.people, ownedPerson\]/);
});

test("Unverified global context cannot trigger extra person reads", async () => {
  const route = await source("src/app/api/ai-chat/route.ts");
  assert.match(route, /verifiedScope\?\.type === "person" \|\| verifiedScope\?\.type === "event" \|\| verifiedScope\?\.type === "task"/);
  assert.match(route, /: null;\s*if \(scopedPersonId/);
  assert.doesNotMatch(route, /loadOwnedHomePerson\(supabase,/);
});
