import assert from "node:assert/strict";
import test from "node:test";

import {
  filterNotesMemories,
  formatNotesResultCount,
} from "../src/lib/repositories/memory.types.ts";

const people = [
  { id: "kasia", name: "Kasia Nowak", relation: "friend" },
  { id: "olek", name: "Olek Kowalski", relation: "family" },
];

function memory(id, type, personId = null, overrides = {}) {
  return {
    id,
    content_text: `${id} treść`,
    created_at: `2026-07-${String(13 - Number(id.replace(/\D/g, "") || 0)).padStart(2, "0")}T12:00:00.000Z`,
    person_id: personId,
    images: null,
    ai_tags: null,
    ai_summary: null,
    type,
    ...overrides,
  };
}

const memories = [
  memory("m1", "memory", "kasia", { content_text: "Wieczór w kinie" }),
  memory("m2", "story", "olek"),
  memory("m3", "gift", "olek", { ai_tags: ["rower"] }),
  memory("m4", "journal", "kasia"),
  memory("m5", "note"),
  memory("m6", null),
  memory("m7", "   ", "kasia"),
  memory("m8", "restaurant", "kasia"),
  memory("m9", "coffee"),
];

function run(overrides = {}) {
  return filterNotesMemories({
    memories,
    people,
    primaryFilter: "all",
    personId: "all",
    search: "",
    ...overrides,
  });
}

function ids(rows) {
  return rows.map((row) => row.id);
}

test("all returns every record in its existing order", () => {
  assert.deepEqual(ids(run()), ids(memories));
});

test("people returns records with person_id", () => {
  assert.deepEqual(ids(run({ primaryFilter: "people" })), ["m1", "m2", "m3", "m7", "m8"]);
});

test("people excludes journal even when malformed data links a person", () => {
  assert.equal(run({ primaryFilter: "people" }).some((row) => row.id === "m4"), false);
});

test("memory returns raw memory records", () => {
  assert.equal(run({ primaryFilter: "memory" }).some((row) => row.id === "m1"), true);
});

test("story follows the current memory compatibility mapping", () => {
  assert.equal(run({ primaryFilter: "memory" }).some((row) => row.id === "m2"), true);
});

test("gift returns only exact normalized gift records", () => {
  assert.deepEqual(ids(run({ primaryFilter: "gift" })), ["m3"]);
});

test("journal returns journal records", () => {
  assert.deepEqual(ids(run({ primaryFilter: "journal" })), ["m4"]);
});

test("note includes explicit note plus null and blank normalized records", () => {
  assert.deepEqual(ids(run({ primaryFilter: "note" })), ["m5", "m6", "m7"]);
});

test("unknown restaurant remains visible in all", () => {
  assert.equal(run().some((row) => row.id === "m8"), true);
});

test("unknown restaurant with person_id appears in people", () => {
  assert.equal(run({ primaryFilter: "people" }).some((row) => row.id === "m8"), true);
});

test("unknown restaurant does not appear in gift", () => {
  assert.equal(run({ primaryFilter: "gift" }).some((row) => row.id === "m8"), false);
});

test("person filter works together with primary filter", () => {
  assert.deepEqual(ids(run({ primaryFilter: "memory", personId: "kasia" })), ["m1"]);
});

test("search works together with primary and person filters", () => {
  assert.deepEqual(
    ids(run({ primaryFilter: "memory", personId: "kasia", search: "kinie" })),
    ["m1"]
  );
  assert.deepEqual(
    ids(run({ primaryFilter: "gift", personId: "olek", search: "rower" })),
    ["m3"]
  );
  assert.deepEqual(
    ids(run({ primaryFilter: "memory", personId: "kasia", search: "kasia" })),
    ["m1"]
  );
});

test("result count uses Polish pluralization for 1, 2, and 5", () => {
  assert.equal(formatNotesResultCount(1), "1 zapis");
  assert.equal(formatNotesResultCount(2), "2 zapisy");
  assert.equal(formatNotesResultCount(5), "5 zapisów");
});

test("changing control order produces the same final result", () => {
  let primaryFirst = { primaryFilter: "all", personId: "all", search: "" };
  primaryFirst = { ...primaryFirst, primaryFilter: "memory" };
  primaryFirst = { ...primaryFirst, personId: "kasia" };
  primaryFirst = { ...primaryFirst, search: "kinie" };

  let searchFirst = { primaryFilter: "all", personId: "all", search: "" };
  searchFirst = { ...searchFirst, search: "kinie" };
  searchFirst = { ...searchFirst, personId: "kasia" };
  searchFirst = { ...searchFirst, primaryFilter: "memory" };

  assert.deepEqual(ids(run(primaryFirst)), ["m1"]);
  assert.deepEqual(ids(run(primaryFirst)), ids(run(searchFirst)));
});
