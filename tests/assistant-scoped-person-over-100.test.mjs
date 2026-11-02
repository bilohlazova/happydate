import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { includeVerifiedScopedPerson } from "../src/lib/assistant/includeVerifiedScopedPerson.ts";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the 101st verified owned person is hydrated without changing Home's first 100", async () => {
  const firstHundred = Array.from({ length: 100 }, (_, index) => ({ id: `person-${index + 1}`, name: `Person ${index + 1}` }));
  let calls = 0;
  const loaded = await includeVerifiedScopedPerson(firstHundred, "person-101", async (id) => {
    calls += 1;
    assert.equal(id, "person-101");
    return { id, name: "Person 101" };
  });
  assert.equal(calls, 1);
  assert.equal(firstHundred.length, 100);
  assert.equal(loaded.length, 101);
  assert.equal(loaded.at(-1)?.name, "Person 101");
});

test("already present scoped people are not fetched again", async () => {
  const people = [{ id: "person-1" }];
  const result = await includeVerifiedScopedPerson(people, "person-1", async () => {
    throw new Error("unexpected lookup");
  });
  assert.equal(result, people);
});

test("global, event-without-person and task-without-person contexts never fetch extra people", async () => {
  const people = [{ id: "person-1" }];
  for (const scopedId of [null, null, null]) {
    const result = await includeVerifiedScopedPerson(people, scopedId, async () => {
      throw new Error("unexpected lookup");
    });
    assert.equal(result, people);
  }
});

test("missing owned person fails closed rather than trusting client context", async () => {
  await assert.rejects(
    () => includeVerifiedScopedPerson([], "foreign-person", async () => null),
    /Verified scoped person unavailable/,
  );
});

test("owner lookup returning an unexpected person's ID fails closed", async () => {
  await assert.rejects(
    () => includeVerifiedScopedPerson([], "person-101", async () => ({ id: "foreign-person" })),
    /Verified scoped person unavailable/,
  );
});

test("Home remains capped, owner lookup is filtered, and route passes only verified scope IDs", async () => {
  const [repository, route] = await Promise.all([
    source("src/lib/repositories/home/home.repository.ts"),
    source("src/app/api/ai-chat/route.ts"),
  ]);
  assert.match(repository, /\.limit\(100\)/);
  assert.match(repository, /export async function loadOwnedHomePerson\(/);
  assert.match(repository, /\.eq\("id", personId\)\s*\.eq\("user_id", userId\)\s*\.maybeSingle\(\)/);
  assert.match(route, /resolveVerifiedChatScope/);
  assert.match(route, /verifiedScope\?\.type === "person" \|\| verifiedScope\?\.type === "event" \|\| verifiedScope\?\.type === "task"/);
  assert.match(route, /homeData\.people = await includeVerifiedScopedPerson\(homeData\.people, scopedPersonId/);
  assert.match(route, /loadOwnedHomePerson\(rlsSession\.client, identity\.userId!, personId\)/);
});
