import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createTranslator } from "next-intl";

const root = process.cwd();
const locales = ["pl", "uk", "en", "ru", "de"];
async function dictionary(locale) {
  return JSON.parse(await readFile(path.join(root, "messages", locale, "notes.json"), "utf8"));
}
async function translator(locale) {
  return createTranslator({ locale, messages: { notes: await dictionary(locale) }, namespace: "notes" });
}

test("Notes title, search, filters, types, selector, editor, validation and a11y exist in five locales", async () => {
  for (const locale of locales) {
    const t = await translator(locale);
    for (const key of ["page.title", "search.placeholder", "filters.all", "filters.people", "types.other", "typeSelector.noteDescription", "editor.addMemory", "validation.giftIdeaRequired", "upload.failed", "accessibility.closeLightbox"]) {
      assert.ok(t(key).trim(), `${locale}:${key}`);
    }
  }
});

test("Notes dictionaries have exact key parity and no empty values", async () => {
  const paths = (value, prefix = "") => Object.entries(value).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" ? paths(child, next) : [next];
  }).sort();
  const polish = await dictionary("pl");
  for (const locale of locales) {
    const current = await dictionary(locale);
    assert.deepEqual(paths(current), paths(polish));
    for (const key of paths(current)) {
      const value = key.split(".").reduce((node, part) => node[part], current);
      assert.equal(typeof value, "string");
      assert.ok(value.trim());
    }
  }
});

test("Notes ICU counts, images and recent dates follow locale plural rules", async () => {
  const pl = await translator("pl");
  const en = await translator("en");
  const uk = await translator("uk");
  assert.equal(pl("page.resultCount", { count: 2 }), "2 zapisy");
  assert.equal(pl("page.resultCount", { count: 5 }), "5 zapisów");
  assert.equal(en("card.imageCount", { count: 2 }), "2 images");
  assert.equal(uk("dates.daysAgo", { count: 5 }), "5 днів тому");
  assert.equal(en("dates.today"), "Today");
  assert.equal(en("dates.yesterday"), "Yesterday");
});

test("Notes implementation preserves user data, raw types, routes, filters and signed-image flow", async () => {
  const page = await readFile(path.join(root, "src/app/notes/NotesPageContent.tsx"), "utf8");
  const editor = await readFile(path.join(root, "src/components/notes/MemoryEditorSheet.tsx"), "utf8");
  const card = await readFile(path.join(root, "src/components/notes/NoteMemoryCard.tsx"), "utf8");
  assert.match(page, /filterMemories\(\{/);
  assert.match(page, /createMemoryImageSignedUrls/);
  assert.match(page, /setShowModal\(true\)/);
  assert.doesNotMatch(page, /\/pl\/notes|\/en\/notes/);
  assert.doesNotMatch(editor, /error\.message/);
  assert.match(card, /memory\.content_text/);
  assert.match(card, /normalizeStoredMemoryType\(memory\.type\)/);
});

test("German Notes layout keeps fluid mobile controls and type descriptions", async () => {
  const page = await readFile(path.join(root, "src/app/notes/NotesPageContent.tsx"), "utf8");
  assert.match(page, /max-width: var\(--hd-screen-max\)/);
  assert.match(page, /typeSelector\.\$\{option\.type\}Description/);
  assert.doesNotMatch(page, /min-width:\s*[4-9]\d{2}px/);
});
