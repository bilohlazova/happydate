import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("listener route is a safe coming-soon preview without sales or booking", async () => {
  const page = await readFile(
    path.join(root, "src/app/services/wysluchaj-mnie/page.tsx"),
    "utf8",
  );

  assert.match(page, /<ComingSoonNotice/);
  assert.match(page, /preview\.boundaryTitle/);
  assert.match(page, /preview\.readiness/);
  assert.doesNotMatch(page, /checkout|survey\?flow=listener|79 zł|129 zł/);
  assert.doesNotMatch(page, /bookShort|buyVoucher|dedication/);
});

test("listener safety boundary is localized for every supported locale", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const preview = JSON.parse(
      await readFile(path.join(root, `messages/${locale}/static.json`), "utf8"),
    ).services.phase3b.listener.preview;

    assert.equal(Object.keys(preview.principles).length, 3);
    assert.equal(Object.keys(preview.readiness).length, 4);
    assert.ok(preview.soon.badge);
    assert.ok(preview.boundaryText);
  }
});
