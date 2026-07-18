import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createTranslator } from "next-intl";

const root = process.cwd();
const locales = ["pl", "uk", "en", "ru", "de"];

async function messages(locale) {
  return JSON.parse(await readFile(path.join(root, "messages", locale, "people.json"), "utf8"));
}

test("People title, search, filters, sort, and accessibility exist in all locales", async () => {
  for (const locale of locales) {
    const value = await messages(locale);
    for (const key of [value.page.title, value.search.placeholder, value.filters.family, value.filters.birthday, value.accessibility.personRow]) {
      assert.equal(typeof key, "string");
      assert.ok(key.trim());
    }
  }
});

test("people count and birthday countdown use locale-aware ICU plurals", async () => {
  const expected = { pl: ["1 osoba", "2 osoby", "5 osób"], uk: ["1 людина", "2 людини", "5 людей"], en: ["1 person", "2 people", "5 people"], ru: ["1 человек", "2 человека", "5 человек"], de: ["1 Person", "2 Personen", "5 Personen"] };
  for (const locale of locales) {
    const t = createTranslator({ locale, messages: { people: await messages(locale) } });
    assert.deepEqual([1, 2, 5].map((count) => t("people.page.count", { count })), expected[locale]);
    assert.ok(t("people.birthday.countdown", { days: 0 }));
    assert.ok(t("people.birthday.countdown", { days: 1 }));
    assert.ok(t("people.birthday.countdown", { days: 5 }));
  }
});

test("relationship labels include gender-aware client and neutral fallback", async () => {
  const expected = { pl: ["Klient", "Klientka"], uk: ["Клієнт", "Клієнтка"], en: ["Client", "Client"], ru: ["Клиент", "Клиентка"], de: ["Kunde", "Kundin"] };
  for (const locale of locales) {
    const t = createTranslator({ locale, messages: { people: await messages(locale) } });
    assert.deepEqual([t("people.relationships.client.male"), t("people.relationships.client.female")], expected[locale]);
    assert.ok(t("people.relationships.client.neutral"));
  }
});

test("People presentation preserves user values and unprefixed routes", async () => {
  const page = await readFile(path.join(root, "src/components/people/PeoplePageContent.tsx"), "utf8");
  const card = await readFile(path.join(root, "src/components/people/PersonCard.tsx"), "utf8");
  const menu = await readFile(path.join(root, "src/components/people/AddPersonMenu.tsx"), "utf8");
  assert.match(page, /person\.name/);
  assert.match(page, /item\.searchText/);
  assert.doesNotMatch(page, /memory\.(?:value_text|content_text)/);
  assert.match(card, /person\.name/);
  assert.match(menu, /href: "\/people\/add\?mode=/);
  assert.doesNotMatch(menu, /href: `\/$\{locale\}/);
});

test("recommendation uses semantic localization while unknown copy remains a safe fallback", async () => {
  const source = await readFile(path.join(root, "src/components/people/HappyRecommendationCard.tsx"), "utf8");
  assert.match(source, /recommendation\.title/);
  assert.match(source, /recommendation\.message/);
  assert.match(source, /recommendation\.actionLabel/);
  assert.match(source, /recommendation\.translation/);
  assert.doesNotMatch(source, /Happy poleca dziś/);
});

test("German mobile-critical controls remain fluid", async () => {
  const files = ["PeopleSearch.tsx", "PeopleFilterSheet.tsx", "PersonCard.tsx", "AddPersonMenu.tsx"];
  for (const file of files) {
    const source = await readFile(path.join(root, "src/components/people", file), "utf8");
    assert.doesNotMatch(source, /w-\[(?:1[6-9]|[2-9]\d)rem\]/);
  }
});
