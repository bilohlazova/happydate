import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("notes opens as Happy memory with an explicit privacy promise", async () => {
  const page = await readFile(new URL("../src/app/notes/NotesPageContent.tsx", import.meta.url), "utf8");

  assert.match(page, /page\.eyebrow/);
  assert.match(page, /page\.subtitle/);
  assert.match(page, /hd-memory-trust/);
  assert.match(page, /page\.trustTitle/);
  assert.match(page, /page\.trustBody/);
});
