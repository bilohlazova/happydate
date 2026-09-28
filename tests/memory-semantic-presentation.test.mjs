import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const presentation = await import("../src/lib/memories/memorySemanticPresentation.ts");
const notesPage = await readFile(path.join(root, "src/app/notes/NotesPageContent.tsx"), "utf8");
const memoryCard = await readFile(path.join(root, "src/components/notes/NoteMemoryCard.tsx"), "utf8");

const expected = {
  uk: { like: "Подобається", dislike: "Не подобається", important_fact: "Важливі факти", personal_fact: "Особистий факт" },
  pl: { like: "Lubi", dislike: "Nie lubi", important_fact: "Ważne fakty", personal_fact: "Fakt osobisty" },
  en: { like: "Likes", dislike: "Dislikes", important_fact: "Important facts", personal_fact: "Personal fact" },
  de: { like: "Mag", dislike: "Mag nicht", important_fact: "Wichtige Fakten", personal_fact: "Persönliche Tatsache" },
  ru: { like: "Нравится", dislike: "Не нравится", important_fact: "Важные факты", personal_fact: "Личный факт" },
};

test("all supported locales localize the four visible semantic labels", () => {
  for (const [locale, labels] of Object.entries(expected)) {
    for (const [key, label] of Object.entries(labels)) {
      assert.equal(presentation.formatMemorySemanticLabel(key, locale), label, `${locale}:${key}`);
    }
  }
});

test("repeated-topic summaries and topic cards use the centralized localized presentation", () => {
  assert.deepEqual(
    presentation.formatMemorySemanticLabels(["like", "dislike", "important_fact"], "uk"),
    ["Подобається", "Не подобається", "Важливі факти"],
  );
  assert.match(notesPage, /const topTagLabels = formatMemorySemanticLabels\(topTags, locale\)/);
  assert.match(notesPage, /topic: formatMemorySemanticLabel\(thread\.topic, locale\) \?\? "—"/);
  assert.match(notesPage, /topTagLabels\.join\(" · "\)/);
});

test("memory cards localize semantic card titles and tags", () => {
  assert.match(memoryCard, /title: formatMemorySemanticLabel\(memory\.title, locale\)/);
  assert.match(memoryCard, /formatMemorySemanticLabel\(tag, locale\)/);
  assert.equal(presentation.formatMemorySemanticLabel("personal_fact", "uk"), "Особистий факт");
});

test("internal-looking unknown keys are omitted rather than rendered raw", () => {
  for (const locale of Object.keys(expected)) {
    assert.equal(presentation.formatMemorySemanticLabel("private_internal_key", locale), null);
  }
});
