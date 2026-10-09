import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { confirmedBirthdayYear, resolveBirthdayAgeInput } from "../src/lib/birthday/birthdayAgeInput.ts";
import { resolveBirthdayTurningAge } from "../src/lib/birthday/birthdayAge.ts";
import { hasMatchingBirthdayGift, resolveBirthdayUrgency } from "../src/lib/birthday/birthdayPresentation.ts";

const today = "2026-10-08";

test("current and turning age are explicit temporary form modes", () => {
  assert.deepEqual(resolveBirthdayAgeInput({ type: "current_age", age: 19 }, "2000-10-11", "", today), { kind: "exact", birthYear: 2006 });
  assert.deepEqual(resolveBirthdayAgeInput({ type: "turning_age", age: 20 }, "2000-10-11", "", today), { kind: "exact", birthYear: 2006 });
});

test("exact, ambiguous, conflict, and match states do not silently replace the canonical year", () => {
  const exact = resolveBirthdayAgeInput({ type: "current_age", age: 19 }, "2000-10-11", "", today);
  const ambiguous = resolveBirthdayAgeInput({ type: "current_age", age: 19 }, "", "", today);
  const conflict = resolveBirthdayAgeInput({ type: "current_age", age: 19 }, "2000-10-11", "2005", today);
  const match = resolveBirthdayAgeInput({ type: "current_age", age: 19 }, "2000-10-11", "2006", today);
  assert.deepEqual(ambiguous, { kind: "ambiguous", possibleBirthYears: [2006, 2007] });
  assert.deepEqual(conflict, { kind: "conflict", existingBirthYear: 2005, inferredBirthYear: 2006 });
  assert.deepEqual(match, { kind: "match", birthYear: 2006 });
  assert.equal(confirmedBirthdayYear("", exact, "dismiss"), "");
  assert.equal(confirmedBirthdayYear("", exact, "confirm"), "2006");
  assert.equal(confirmedBirthdayYear("2005", conflict, "dismiss"), "2005");
  assert.equal(confirmedBirthdayYear("2005", conflict, "confirm"), "2006");
});

test("birthday urgency uses the existing selected, purchased, and given lifecycle meaning", () => {
  for (const daysUntil of [0, 1, 2, 3]) assert.equal(resolveBirthdayUrgency({ occurrence: "2026-10-11", daysUntil, giftReady: false }), "critical");
  assert.equal(resolveBirthdayUrgency({ occurrence: "2026-10-11", daysUntil: 4, giftReady: false }), "normal");
  assert.equal(resolveBirthdayUrgency({ occurrence: "2026-10-11", daysUntil: 3, giftReady: false }), resolveBirthdayUrgency({ occurrence: "2026-10-11", daysUntil: 3, giftReady: false }));
  for (const lifecycle of ["selected", "purchased", "given"]) {
    const ready = hasMatchingBirthdayGift([{ personId: "p", eventId: "e", lifecycle }], "p", "e");
    assert.equal(ready, true);
    assert.equal(resolveBirthdayUrgency({ occurrence: "2026-10-11", daysUntil: 3, giftReady: ready }), "normal");
  }
});

test("a D-3 birthday composes turning age and critical urgency without either changing the other", () => {
  const suggestion = resolveBirthdayAgeInput({ type: "turning_age", age: 20 }, "2000-10-11", "", today);
  assert.deepEqual(suggestion, { kind: "exact", birthYear: 2006 });
  assert.equal(resolveBirthdayTurningAge({ birthYear: 2006, birthdayOccurrence: "2026-10-11" }), 20);
  assert.equal(resolveBirthdayUrgency({ occurrence: "2026-10-11", daysUntil: 3, giftReady: false }), "critical");
});

test("forms and both birthday surfaces use shared deterministic helpers, explicit confirmation, and accessible urgency without AI", async () => {
  const files = await Promise.all([
    "src/app/people/add/page.tsx", "src/components/people/PeoplePageContent.tsx", "src/components/people/BirthdayAgeFields.tsx", "src/lib/home/buildHomeViewModel.ts", "src/lib/events/eventPreparation.ts", "src/components/happy/HomePrimaryHappyBlock.tsx", "src/components/events/EventPreparationContent.tsx",
  ].map((file) => readFile(file, "utf8")));
  assert.match(files[0], /BirthdayAgeFields/);
  assert.match(files[1], /BirthdayAgeFields/);
  assert.match(files[2], /\["current_age", "turning_age"\]/);
  assert.match(files[2], /candidate !== null/);
  assert.match(files[2], /confirmedBirthdayYear\(birthYear, suggestion, "confirm"\)/);
  assert.match(files[2], /setAge\(""\)/);
  assert.match(files[2], /if \(yearKnown\) return null/);
  assert.doesNotMatch(files[2], /turningLine|resolveBirthdayTurningAge/);
  assert.match(files[3], /resolveBirthdayUrgency/);
  assert.match(files[4], /resolveBirthdayUrgency/);
  assert.match(files[5], /role=\{presentation\.urgency === "critical" \? "status"/);
  assert.match(files[5], /⚠/);
  assert.match(files[6], /role=\{critical \? "status"/);
  assert.match(files[6], /CircleAlert/);
  assert.doesNotMatch(files.join("\n"), /openai|happyAgentProvider|\/api\/happy\/agent/i);
});

test("age labels exist in all product locales", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const messages = JSON.parse(await readFile(`messages/${locale}/personForm.json`, "utf8"));
    assert.ok(messages.ageIntelligence.current && messages.ageIntelligence.turning && messages.ageIntelligence.conflict);
  }
});
