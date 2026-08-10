import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("returns page makes its future commercial scope explicit", async () => {
  const page = await readFile(
    path.join(root, "src/app/regulamin-zwrotow/page.tsx"),
    "utf8",
  );

  assert.match(page, /returns-guide/);
  assert.match(page, /<ComingSoonNotice/);
  assert.match(page, /guide\.soon\.badge/);
  assert.match(page, /guide\.steps/);
  assert.match(page, /sections=\{legal\.returns\.sections\}/);
});

test("future returns journey is localized for every supported locale", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const messages = JSON.parse(
      await readFile(path.join(root, `messages/${locale}/static.json`), "utf8"),
    );
    const guide = messages.legal.returns.guide;

    assert.ok(guide.soon.badge);
    assert.equal(Object.keys(guide.steps).length, 3);
    assert.ok(guide.legalNote);
  }
});
