import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  inferBirthYearFromCurrentAge,
  inferBirthYearFromTurningAge,
  resolveBirthdayTurningAge,
  resolveNextBirthdayOccurrence,
} from "../src/lib/birthday/birthdayAge.ts";

const before = new Date(2026, 9, 8, 12);

test("current age before, after, and on the birthday resolves from the local occurrence", () => {
  assert.deepEqual(inferBirthYearFromCurrentAge({ currentAge: 19, birthday: "2000-10-11", now: before }), { kind: "exact", birthYear: 2006 });
  assert.deepEqual(inferBirthYearFromCurrentAge({ currentAge: 19, birthday: "2000-10-11", now: new Date(2026, 9, 12, 12) }), { kind: "exact", birthYear: 2007 });
  assert.deepEqual(inferBirthYearFromCurrentAge({ currentAge: 20, birthday: "2000-10-08", now: before }), { kind: "exact", birthYear: 2006 });
});

test("turning age uses the actual occurrence year", () => {
  assert.equal(resolveBirthdayTurningAge({ birthYear: 2006, birthdayOccurrence: "2026-10-11" }, before), 20);
  assert.deepEqual(inferBirthYearFromTurningAge({ turningAge: 20, birthdayOccurrence: "2027-10-11", now: new Date(2026, 9, 12) }), { kind: "exact", birthYear: 2007 });
});

test("unknown birthday leaves two possible birth years rather than inventing one", () => {
  assert.deepEqual(inferBirthYearFromCurrentAge({ currentAge: 19, now: before }), { kind: "ambiguous", possibleBirthYears: [2006, 2007] });
});

test("invalid values and conflicts fail safely", () => {
  assert.deepEqual(inferBirthYearFromCurrentAge({ currentAge: -1, birthday: "2000-10-11", now: before }), { kind: "invalid", reason: "age" });
  assert.deepEqual(inferBirthYearFromCurrentAge({ currentAge: 19.5, birthday: "2000-10-11", now: before }), { kind: "invalid", reason: "age" });
  assert.deepEqual(inferBirthYearFromCurrentAge({ currentAge: 19, birthday: "2000-10-11", existingBirthYear: 2005, now: before }), { kind: "conflict", existingBirthYear: 2005, inferredBirthYear: 2006 });
});

test("leap day uses the same local Date rollover as recurring birthdays", () => {
  const occurrence = resolveNextBirthdayOccurrence("2000-02-29", new Date(2027, 1, 28, 12));
  assert.equal(occurrence?.getFullYear(), 2027);
  assert.equal(occurrence?.getMonth(), 2);
  assert.equal(occurrence?.getDate(), 1);
});

test("age inference remains deterministic and has no provider dependency", async () => {
  const source = await readFile(new URL("../src/lib/birthday/birthdayAge.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /openai|provider|chat|fetch\(/i);
});
