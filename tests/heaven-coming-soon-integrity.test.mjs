import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("message from Heaven is a preview without unverified security or sales claims", async () => {
  const page = await readFile(
    path.join(root, "src/app/services/wiadomosc-z-nieba/page.tsx"),
    "utf8",
  );

  assert.match(page, /<ComingSoonNotice/);
  assert.match(page, /preview\.truthTitle/);
  assert.match(page, /preview\.promises/);
  assert.doesNotMatch(page, /PLANS|planCta|choosePlan|pricesNote/);
  assert.doesNotMatch(page, /99 zł|179 zł|199 zł|299 zł/);
});

test("long-term message obligations are localized for every locale", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const preview = JSON.parse(
      await readFile(path.join(root, `messages/${locale}/static.json`), "utf8"),
    ).services.phase3b.heaven.preview;

    assert.equal(Object.keys(preview.promises).length, 4);
    assert.equal(Object.keys(preview.journey).length, 4);
    assert.ok(preview.soon.badge);
    assert.ok(preview.truthText);
  }
});
