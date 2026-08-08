import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), "utf8");

test("Notes exposes offline, retry and non-destructive mutation states", async () => {
  const page = await read("src/app/notes/NotesPageContent.tsx");
  const editor = await read("src/components/notes/MemoryEditorSheet.tsx");

  assert.match(page, /addEventListener\("offline"/);
  assert.match(page, /addEventListener\("online"/);
  assert.match(page, /navigator\.onLine/);
  assert.match(page, /refreshNotes/);
  assert.match(page, /states\.deleteFailed/);
  assert.match(editor, /failureCode === "OFFLINE"/);
  assert.match(editor, /states\.offlineAction/);
});

test("Notes dialogs support focus, Escape, keyboard image navigation and reduced motion", async () => {
  const page = await read("src/app/notes/NotesPageContent.tsx");
  const editor = await read("src/components/notes/MemoryEditorSheet.tsx");

  assert.match(editor, /aria-modal="true"/);
  assert.match(editor, /event\.key === "Escape"/);
  assert.match(editor, /event\.key !== "Tab"/);
  assert.match(editor, /previouslyFocused\?\.focus\(\)/);
  assert.match(page, /event\.key === "ArrowLeft"/);
  assert.match(page, /event\.key === "ArrowRight"/);
  assert.match(page, /prefers-reduced-motion:\s*reduce/);
  assert.match(page, /aria-live="polite"/);
});

test("Notes mobile controls retain touch-sized interactive targets", async () => {
  const page = await read("src/app/notes/NotesPageContent.tsx");
  assert.match(page, /\.hd-add-btn[\s\S]*?width:\s*40px;\s*height:\s*40px/);
  assert.match(page, /\.hd-tab[\s\S]*?min-height:\s*44px/);
  assert.match(page, /\.hd-card-menu-btn[\s\S]*?width:\s*44px;\s*height:\s*44px/);
});
