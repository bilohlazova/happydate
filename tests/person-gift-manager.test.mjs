import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Person profile includes one canonical gift management workspace", async () => {
  const [profile, manager] = await Promise.all([
    source("src/components/people/PersonProfileContent.tsx"),
    source("src/components/people/PersonGiftManager.tsx"),
  ]);
  assert.equal((profile.match(/<PersonGiftManager/g) ?? []).length, 1);
  assert.match(manager, /loadPersonGiftManagement/);
  assert.match(manager, /createPersonGiftIdea/);
  assert.match(manager, /changePersonGiftLifecycle/);
  assert.match(manager, /savePersonGiftLink/);
  assert.match(manager, /removePersonGiftLink/);
});

test("given history and external link actions require explicit safe interaction", async () => {
  const manager = await source("src/components/people/PersonGiftManager.tsx");
  assert.match(manager, /next === "given" && !window\.confirm/);
  assert.match(manager, /type="url"/);
  assert.match(manager, /pattern="https:\/\/\.\*"/);
  assert.match(manager, /target="_blank" rel="noopener noreferrer"/);
  assert.match(manager, /window\.confirm\(t\("confirmDeleteLink"\)\)/);
});

test("legacy Knowledge gifts remain visibly read-only", async () => {
  const [mapper, manager] = await Promise.all([
    source("src/lib/gifts/gift.mapper.ts"),
    source("src/components/people/PersonGiftManager.tsx"),
  ]);
  assert.match(mapper, /canChangeLifecycle: gift\.sourceKnowledgeId === null/);
  assert.match(manager, /!gift\.canChangeLifecycle/);
  assert.match(manager, /legacyReadOnly/);
});

test("gift manager messages have exact locale parity", async () => {
  const locales = ["pl", "uk", "en", "ru", "de"];
  const gifts = await Promise.all(locales.map(async (locale) =>
    JSON.parse(await source(`messages/${locale}/person.json`)).profileUi.gifts
  ));
  const keys = (value, prefix = "") => Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" ? keys(child, path) : [path];
  }).sort();
  for (const dictionary of gifts) {
    assert.deepEqual(keys(dictionary), keys(gifts[0]));
    assert.equal(keys(dictionary).every((key) => key.length > 0), true);
  }
});
