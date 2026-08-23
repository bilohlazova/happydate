import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Notes uses the shared HappyDate visual language and accessible capture actions", async () => {
  const source = await readFile(new URL("../src/app/notes/NotesPageContent.tsx", import.meta.url), "utf8");
  assert.match(source, /var\(--hd-canvas\)/);
  assert.match(source, /className="hd-empty-action"/);
  assert.match(source, /aria-label=\{t\("search\.placeholder"\)\}/);
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(source, /sortOrder/);
  assert.match(source, /days >= 60/);
  assert.match(source, /insights\.stalePerson/);
  assert.match(source, /openNew\("note", stalePerson\.person\.id\)/);
});
