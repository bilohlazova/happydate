import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const locales = ["uk", "pl", "en", "de", "ru"];

test("all product locales provide localized turning-age copy for profile, Home rows, and deterministic Happy intro", async () => {
  for (const locale of locales) {
    const [home, person] = await Promise.all([
      readFile(`messages/${locale}/home.json`, "utf8").then(JSON.parse),
      readFile(`messages/${locale}/person.json`, "utf8").then(JSON.parse),
    ]);
    assert.ok(home.events?.turningAge, `${locale} Home event label`);
    assert.ok(home.wellbeing?.birthdayReturningIntroWithAge, `${locale} Happy intro`);
    assert.ok(person.profileUi?.turningAge, `${locale} profile label`);
  }
});

test("React presentation consumes prebuilt labels and contains neither age arithmetic nor AI/provider access", async () => {
  const files = await Promise.all([
    "src/components/home-dashboard/FeaturedEventCard.tsx",
    "src/components/home-dashboard/UpcomingEventRow.tsx",
    "src/components/home-dashboard/WellbeingCheckIn.tsx",
    "src/components/happy/HomePrimaryHappyBlock.tsx",
    "src/components/people/PersonProfileContent.tsx",
  ].map((file) => readFile(file, "utf8")));
  const source = files.join("\n");
  assert.match(files[0], /event\.birthdayAgeLabel/);
  assert.match(files[1], /event\.birthdayAgeLabel/);
  assert.match(files[3], /presentation\.turningAgeLabel/);
  assert.match(files[4], /hero\.turningAge/);
  assert.doesNotMatch(source, /resolveBirthdayTurningAge|currentYear\s*-\s*birthYear|age\s*%|openai|provider|happyAgentProvider/i);
});
