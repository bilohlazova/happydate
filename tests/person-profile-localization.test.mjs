import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createTranslator } from "next-intl";

import { getPersonKnowledgeCardModel, getPersonKnowledgeChips } from "../src/lib/people/personKnowledgePresentation.ts";

const root = process.cwd();
const locales = ["pl", "uk", "en", "ru", "de"];
async function dictionary(locale, namespace) { return JSON.parse(await readFile(path.join(root, "messages", locale, `${namespace}.json`), "utf8")); }

test("person profile and knowledge labels exist in all locales", async () => {
  for (const locale of locales) {
    const value = await dictionary(locale, "person");
    for (const text of [value.profile.title, value.knowledge.title, value.knowledge.facts, value.knowledge.completeness, value.knowledge.lastMemory, value.accessibility.profile]) assert.ok(text.trim());
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

test("knowledge values stay unchanged, gift contents stay hidden, and six-chip cap remains", () => {
  const values = ["Flat White", "Fotografia", "Ramen", "Tatry", "Jazz", "Diuna", "Tenis"];
  const knowledge = { interests:[values[0]], favoriteDrinks:[values[1]], favoritePlaces:[values[2]], hobbies:[values[3]], movies:[values[4]], books:[values[5]], travel:[values[6]], sports:[], flowers:[], perfumes:[], favoriteFood:[], music:[], pets:[], giftIdeas:["Sekretny prezent"], knownFactsCount:7, memoriesCount:1, completenessScore:70, latestMemoryDate:"2026-07-16T12:00:00.000Z", sourceMemoryIds:[] };
  const chips = getPersonKnowledgeChips(knowledge);
  const model = getPersonKnowledgeCardModel(knowledge, "de");
  assert.equal(chips.chips.length, 6);
  assert.equal(chips.remainingCount, 1);
  assert.deepEqual(chips.chips.map((chip) => chip.value), values.slice(0, 6));
  assert.equal(model.showGiftSummary, true);
  assert.equal(JSON.stringify(model).includes("Sekretny prezent"), false);
  assert.match(model.latestMemoryDateLabel, /2026/);
});

test("localized more label and advisor fallback are safe", async () => {
  for (const locale of locales) {
    const person = await dictionary(locale, "person");
    const t = createTranslator({ locale, messages: { person } });
    assert.ok(t("person.knowledge.more", { count: 3 }).includes("3"));
  }
  const advisor = await readFile(path.join(root, "src/components/advisor/HappyDateAdvisor.tsx"), "utf8");
  assert.match(advisor, /title: tip\.title, message: tip\.message/);
});

test("person name, custom relation, memory values, and routes remain untouched", async () => {
  const page = await readFile(path.join(root, "src/app/people/[id]/page.tsx"), "utf8");
  const card = await readFile(path.join(root, "src/components/people/PersonCard.tsx"), "utf8");
  const memory = await readFile(path.join(root, "src/components/memories/MemoryTimelineItem.tsx"), "utf8");
  assert.match(page, /person\.name/);
  assert.match(card, /relationKey !== "other"[\s\S]*: relationLabel/);
  assert.match(memory, /memory\./);
  assert.match(page, /useParams/);
  assert.doesNotMatch(page, /\/$\{locale\}\/people/);
});

test("German profile controls use fluid layout assumptions", async () => {
  for (const file of ["src/components/people/PersonKnowledgeCard.tsx", "src/components/memories/MemoryList.tsx", "src/components/advisor/HappyDateAdvisor.tsx"]) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.doesNotMatch(source, /w-\[(?:1[6-9]|[2-9]\d)rem\]/);
  }
});
