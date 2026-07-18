import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const scopedFiles = [
  "src/app/(app)/dashboard/page.tsx",
  "src/components/CalendarToolbar.tsx",
  "src/components/EventsCalendar.tsx",
  "src/app/care/page.tsx",
  "src/app/care/add-memory/page.tsx",
  "src/components/people/PeopleSelect.tsx",
  "src/app/people/add/page.tsx",
];

test("core routes do not contain known hardcoded Polish UI copy", async () => {
  const forbidden = [
    "Brak wydarzeń",
    "Dodaj wydarzenie",
    "Poprzedni miesiąc",
    "Następny miesiąc",
    "Wybierz ważne kontakty",
    "Importowanie...",
    "Brak osób",
    "Zapisywanie...",
    "Nie udało się zapisać",
    "Tytuł wydarzenia",
    "Notatka (opcjonalnie)",
  ];
  for (const file of scopedFiles) {
    const source = await readFile(path.join(root, file), "utf8");
    for (const copy of forbidden)
      assert.equal(source.includes(copy), false, `${file}: ${copy}`);
  }
});

test("calendar labels and dates use presentation translations and active locale", async () => {
  const [dashboard, calendar, toolbar] = await Promise.all([
    readFile(path.join(root, scopedFiles[0]), "utf8"),
    readFile(path.join(root, scopedFiles[2]), "utf8"),
    readFile(path.join(root, scopedFiles[1]), "utf8"),
  ]);
  assert.match(dashboard, /useLocale\(\)/);
  assert.match(dashboard, /categories\.\$\{c\.value\}/);
  assert.doesNotMatch(dashboard, /Intl\.DateTimeFormat\("pl-PL"/);
  assert.match(calendar, /DATE_LOCALES/);
  assert.match(calendar, /useLocale\(\)/);
  assert.match(toolbar, /dashboard\.navigation/);
});

test("contact import and validation states are translated while contact names stay raw", async () => {
  const source = await readFile(
    path.join(root, "src/app/people/add/page.tsx"),
    "utf8"
  );
  for (const key of [
    "contact.denied",
    "contact.importError",
    "contact.noneSelected",
    "contact.parsed",
  ]) {
    assert.match(source, new RegExp(key.replace(".", "\\.")));
  }
  assert.match(source, /\{contact\.name\}/);
  assert.doesNotMatch(source, /\{t\([^)]*contact\.name/);
  assert.doesNotMatch(source, /startsWith\("Brak dostępu"\)/);
});

test("memory type values remain canonical and labels are translated", async () => {
  const source = await readFile(
    path.join(root, "src/app/care/add-memory/page.tsx"),
    "utf8"
  );
  assert.match(source, /value: "memory"/);
  assert.match(source, /types\.\$\{memoryType\.value\}/);
  assert.doesNotMatch(source, /label: "Wspomnienie"/);
});
