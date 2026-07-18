import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { canonicalRelationKey } from "../src/lib/people/canonicalRelation.ts";

const root = process.cwd();
const locales = ["pl", "uk", "en", "ru", "de"];
const namespaces = [
  "common",
  "navigation",
  "profile",
  "auth",
  "people",
  "person",
  "personForm",
  "notes",
  "reminders",
  "home",
  "assistant",
  "gift",
  "dashboard",
  "care",
  "static",
];

function leafKeys(value, prefix = "") {
  return Object.entries(value)
    .flatMap(([key, child]) => {
      const next = prefix ? `${prefix}.${key}` : key;
      return child && typeof child === "object"
        ? leafKeys(child, next)
        : [next];
    })
    .sort();
}

test("all supported locales have exact message-key parity", async () => {
  for (const namespace of namespaces) {
    const dictionaries = await Promise.all(
      locales.map(async (locale) =>
        JSON.parse(
          await readFile(
            path.join(root, "messages", locale, `${namespace}.json`),
            "utf8"
          )
        )
      )
    );
    const expected = leafKeys(dictionaries[0]);
    for (let index = 0; index < locales.length; index += 1) {
      assert.deepEqual(
        leafKeys(dictionaries[index]),
        expected,
        `${namespace}:${locales[index]}`
      );
    }
  }
});

test("legacy localized relations map to canonical keys while custom text stays custom", () => {
  const fixtures = {
    spouse: ["Żona", "Чоловік", "Жена", "Ehefrau", "Wife"],
    parent: ["Mama", "Тато", "Отец", "Mutter", "Father"],
    sibling: ["Brat", "Сестра", "Брат", "Schwester", "Sister"],
    child: ["Córka", "Донька", "Дочь", "Sohn", "Daughter"],
  };
  for (const [key, labels] of Object.entries(fixtures)) {
    for (const label of labels)
      assert.equal(canonicalRelationKey(null, label), key, label);
  }
  assert.equal(canonicalRelationKey(null, "Trenerka jogi"), "other");
  assert.equal(canonicalRelationKey(null, null), null);
});

test("relation and enum presentation no longer compares visible Polish labels in React", async () => {
  const files = [
    "src/components/people/PersonProfileContent.tsx",
    "src/components/people/PeopleFilterSheet.tsx",
    "src/components/people/ActivePeopleFilters.tsx",
    "src/app/gift/start/GiftWorkspacePanel.tsx",
  ];
  const forbidden = [
    "Brat",
    "Siostra",
    "Mama",
    "Tata",
    "Żona",
    "Mąż",
    "Wszystkie",
    "Wręczone",
    "Kupione",
  ];
  for (const file of files) {
    const source = await readFile(path.join(root, file), "utf8");
    for (const label of forbidden)
      assert.equal(source.includes(label), false, `${file}: ${label}`);
  }
});

test("profile ViewModel exposes canonical relation metadata and preserves custom labels", async () => {
  const [types, builder, profile] = await Promise.all([
    readFile(path.join(root, "src/lib/people/peopleData.types.ts"), "utf8"),
    readFile(
      path.join(root, "src/lib/people/buildPeopleViewModels.ts"),
      "utf8"
    ),
    readFile(
      path.join(root, "src/components/people/PersonProfileContent.tsx"),
      "utf8"
    ),
  ]);
  assert.match(types, /relationKey:/);
  assert.match(types, /gender:/);
  assert.match(builder, /canonicalRelationKey/);
  assert.match(profile, /relationships\.\$\{hero\.relationKey\}/);
  assert.match(profile, /: hero\.relationLabel/);
});

test("unknown event categories and gift lifecycle use translations instead of raw enums", async () => {
  const [home, gift] = await Promise.all([
    readFile(path.join(root, "src/lib/home/buildHomeViewModel.ts"), "utf8"),
    readFile(
      path.join(root, "src/app/gift/start/GiftWorkspacePanel.tsx"),
      "utf8"
    ),
  ]);
  assert.match(
    home,
    /supported\[event\.category\] \?\? t\("categories\.other"\)/
  );
  for (const lifecycle of ["idea", "selected", "purchased", "given"]) {
    assert.match(gift, new RegExp(`workspace\\.lifecycle\\.${lifecycle}`));
  }
});
