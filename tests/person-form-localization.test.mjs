import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createTranslator } from "next-intl";

const root = process.cwd();
const locales = ["pl", "uk", "en", "ru", "de"];
async function messages(locale, namespace) { return JSON.parse(await readFile(path.join(root, "messages", locale, `${namespace}.json`), "utf8")); }

test("add/edit titles, gender, validation, and accessibility exist in every locale", async () => {
  for (const locale of locales) {
    const value = await messages(locale, "personForm");
    for (const text of [value.title.add, value.title.edit, value.gender.female, value.gender.male, value.gender.unspecified, value.validation.nameRequired, value.states.saveError, value.accessibility.form]) assert.ok(text.trim());
  }
});

test("manual relationship UI reuses localized People mapping", async () => {
  const expectedClients = { pl:["Klient","Klientka"], uk:["Клієнт","Клієнтка"], en:["Client","Client"], ru:["Клиент","Клиентка"], de:["Kunde","Kundin"] };
  for (const locale of locales) {
    const people = await messages(locale, "people");
    const t = createTranslator({ locale, messages:{ people } });
    assert.deepEqual([t("people.relationships.client.male"), t("people.relationships.client.female")], expectedClients[locale]);
    assert.ok(t("people.relationships.friend.male"));
    assert.ok(t("people.relationships.friend.female"));
  }
});

test("manual mode is isolated from contacts, scanner, and link copy", async () => {
  const source = await readFile(path.join(root, "src/app/people/add/page.tsx"), "utf8");
  assert.match(source, /localized=\{mode === "manual"\}/);
  assert.match(source, /mode === "manual"\s*\? t\("title\.add"\)\s*: peopleT\(`actions\.\$\{modeCopy\.titleKey\}`\)/);
  assert.match(source, /contactSource: mode/);
  assert.match(source, /contactSource: "contacts"/);
  assert.match(source, /t\("capture\.addCardImage"\)/);
  assert.match(source, /t\("capture\.parseLink"\)/);
});

test("locale changes cannot reset entered form state", async () => {
  const source = await readFile(path.join(root, "src/app/people/add/page.tsx"), "utf8");
  for (const state of ["name", "gender", "relationship", "birthday", "phone", "email"]) assert.match(source, new RegExp(`const \\[${state}, set${state[0].toUpperCase()}${state.slice(1)}\\] = useState`));
  assert.doesNotMatch(source, /useEffect\([^]*setGender\([^]*locale/);
  assert.doesNotMatch(source, /useEffect\([^]*setRelationship\([^]*locale/);
});

test("custom relationship and user-entered values remain unchanged", async () => {
  const relation = await readFile(path.join(root, "src/components/people/RelationPickerField.tsx"), "utf8");
  const source = await readFile(path.join(root, "src/app/people/add/page.tsx"), "utf8");
  assert.match(relation, /selectedKey === "other"/);
  assert.match(relation, /const nextValue = customValue\.trim\(\)/);
  assert.match(source, /name: name\.trim\(\)/);
  assert.match(source, /phone: normalizePhone\(phone\)/);
  assert.match(source, /email: normalizeEmail\(email\)/);
  assert.match(source, /router\.push\("\/people"\)/);
});

test("manual errors are safe localized copy and German controls remain fluid", async () => {
  const source = await readFile(path.join(root, "src/app/people/add/page.tsx"), "utf8");
  const gender = await readFile(path.join(root, "src/components/people/GenderSelectField.tsx"), "utf8");
  const relation = await readFile(path.join(root, "src/components/people/RelationPickerField.tsx"), "utf8");
  assert.match(source, /t\("states\.saveError"\)/);
  assert.doesNotMatch(source, /setError\(submitError/);
  for (const value of [source, gender, relation]) assert.doesNotMatch(value, /w-\[(?:1[6-9]|[2-9]\d)rem\]/);
});
