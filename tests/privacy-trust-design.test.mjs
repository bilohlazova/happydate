import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("privacy starts with a human trust summary without replacing legal sections", async () => {
  const [page, document] = await Promise.all([
    readFile(path.join(root, "src/app/privacy/page.tsx"), "utf8"),
    readFile(path.join(root, "src/components/static/LegalDocument.tsx"), "utf8"),
  ]);

  assert.match(page, /privacy-trust/);
  assert.match(page, /trust\.items/);
  assert.match(page, /href="\/settings\/export"/);
  assert.match(page, /mailto:privacy@happydate\.pl/);
  assert.match(page, /sections=\{legal\.privacy\.sections\}/);
  assert.match(document, /intro\?: ReactNode/);
  assert.ok(document.indexOf("{intro}") < document.indexOf("Object.entries(sections)"));
});

test("privacy trust summary is localized for every supported locale", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const source = await readFile(
      path.join(root, `messages/${locale}/static.json`),
      "utf8",
    );
    const trust = JSON.parse(source).legal.privacy.trust;

    assert.ok(trust.title);
    assert.equal(Object.keys(trust.items).length, 4);
    assert.ok(trust.exportAction);
    assert.ok(trust.legalNote);
  }
});
