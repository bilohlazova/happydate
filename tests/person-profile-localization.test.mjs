import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createTranslator } from "next-intl";

const root = process.cwd();
const locales = ["pl", "uk", "en", "ru", "de"];
async function dictionary(locale, namespace) { return JSON.parse(await readFile(path.join(root, "messages", locale, `${namespace}.json`), "utf8")); }

test("person profile and knowledge labels exist in all locales", async () => {
  for (const locale of locales) {
    const value = await dictionary(locale, "person");
    for (const text of [value.profile.title, value.profile.back, value.knowledge.title, value.knowledge.facts, value.knowledge.completeness, value.knowledge.lastMemory, value.accessibility.profile]) assert.ok(text.trim());
    for (const text of [value.profileUi.likes, value.profileUi.dislikes, value.profileUi.interests, value.profileUi.giftIdeas, value.profileUi.giftHistory, value.profileUi.importantFacts, value.profileUi.timeline, value.profileUi.brain]) assert.ok(text.trim());
  }
});

test("person locales keep only exact timestamped Clipboard success copy", async () => {
  for (const locale of ["uk", "en", "pl", "ru", "de"]) {
    const messages = JSON.parse(await readFile(path.join(root, "messages", locale, "person.json"), "utf8"));
    const audit = messages.profileUi.learningAudit;
    assert.equal(typeof audit.copyDoneAt, "string");
    assert.equal(typeof audit.copyLocalOnlyAt, "string");
    assert.equal("copyDone" in audit, false);
    assert.equal("copyLocalOnly" in audit, false);
  }
});

test("birthday ICU behavior remains complete through shared relationship namespace", async () => {
  for (const locale of locales) {
    const people = await dictionary(locale, "people");
    const t = createTranslator({ locale, messages: { people } });
    assert.ok(t("people.birthday.countdown", { days: 0 }));
    assert.ok(t("people.birthday.countdown", { days: 1 }));
    assert.ok(t("people.birthday.countdown", { days: 5 }));
    assert.ok(t("people.relationships.client.neutral"));
  }
});

test("person name, custom relation, memory values, and routes remain untouched", async () => {
  const page = await readFile(path.join(root, "src/app/people/[id]/page.tsx"), "utf8");
  const profile = await readFile(path.join(root, "src/components/people/PersonProfileContent.tsx"), "utf8");
  const card = await readFile(path.join(root, "src/components/people/PersonCard.tsx"), "utf8");
  assert.match(profile, /hero\.name/);
  assert.match(profile, /item\.value/);
  assert.match(card, /relationKey !== "other"[\s\S]*: relationLabel/);
  assert.match(page, /useParams/);
  assert.doesNotMatch(page, /\/$\{locale\}\/people/);
});

test("German profile controls use fluid layout assumptions", async () => {
  for (const file of ["src/components/people/PersonProfileContent.tsx"]) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.doesNotMatch(source, /w-\[(?:1[6-9]|[2-9]\d)rem\]/);
  }
});
