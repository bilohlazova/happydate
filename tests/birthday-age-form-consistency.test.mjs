import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(path, "utf8");
}

test("a confirmed birthday year hides every age preview and inference control in the edit form", async () => {
  const fields = await source("src/components/people/BirthdayAgeFields.tsx");
  const knownBirthdayBranch = fields.indexOf("if (yearKnown) return null");
  const inputBranch = fields.indexOf("return <div className=\"space-y-3\">");
  assert.ok(knownBirthdayBranch >= 0 && inputBranch > knownBirthdayBranch);
  assert.match(fields, /birthYearFromFullBirthday\(birthday\)/);
  assert.match(fields, /const yearKnown = birthdayYear !== null \|\|/);
  assert.doesNotMatch(fields, /resolveBirthdayTurningAge|resolveNextBirthdayOccurrence|turningLine/);
  assert.match(fields, /\["current_age", "turning_age"\]/);
});

test("create and edit synchronize a complete birthday year through the normal Person save path", async () => {
  const [add, edit, repository, home, event, context] = await Promise.all([
    source("src/app/people/add/page.tsx"),
    source("src/components/people/PeoplePageContent.tsx"),
    source("src/lib/repositories/personRepository.ts"),
    source("src/lib/repositories/home/home.repository.ts"),
    source("src/lib/events/eventPreparation.loader.ts"),
    source("src/lib/happy/agent-context/buildHappyAgentContext.server.ts"),
  ]);
  for (const value of [add, edit]) {
    assert.match(value, /function setBirthdayAndCanonicalYear\(value: string\)/);
    assert.match(value, /birthYearFromFullBirthday\(value\)/);
    assert.match(value, /setBirthYear\(year === null \? "" : String\(year\)\)/);
  }
  assert.match(edit, /const birthdayYear = birthYearFromFullBirthday\(person\.birthday\)/);
  assert.match(repository, /function canonicalBirthYear/);
  assert.match(repository, /const birthYear = canonicalBirthYear\(input\.birthday, input\.birthYear\)/g);
  assert.match(repository, /birth_year: birthYear/);
  assert.match(repository, /function normalizeBirthdayYear/);
  for (const value of [home, event, context]) assert.match(value, /birthYearFromFullBirthday/);
});

test("only an unknown year with active inference keeps the non-authoritative preview path", async () => {
  const fields = await source("src/components/people/BirthdayAgeFields.tsx");
  assert.match(fields, /resolveBirthdayAgeInput\(input, birthday, birthYear, today\)/);
  assert.match(fields, /confirmedBirthdayYear\(birthYear, suggestion, "confirm"\)/);
  assert.match(fields, /setAge\(""\)/);
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const messages = JSON.parse(await source(`messages/${locale}/personForm.json`));
    assert.ok(messages.ageIntelligence.current);
    assert.ok(messages.ageIntelligence.turning);
  }
  assert.doesNotMatch(fields, /openai|provider|fetch\(|\/api\/happy\/agent/i);
});
