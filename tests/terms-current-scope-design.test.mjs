import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("terms clearly separate the current care product from future commerce", async () => {
  const page = await readFile(path.join(root, "src/app/regulamin/page.tsx"), "utf8");

  assert.match(page, /terms-guide/);
  assert.match(page, /guide\.items/);
  assert.match(page, /<ComingSoonNotice/);
  assert.match(page, /guide\.soon\.badge/);
  assert.match(page, /sections=\{legal\.terms\.sections\}/);
});

test("terms scope guide is localized for every supported locale", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const messages = JSON.parse(
      await readFile(path.join(root, `messages/${locale}/static.json`), "utf8"),
    );
    const guide = messages.legal.terms.guide;

    assert.equal(Object.keys(guide.items).length, 3);
    assert.ok(guide.soon.badge);
    assert.ok(guide.soon.title);
    assert.ok(guide.soon.text);
  }
});
