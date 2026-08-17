import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("services separates the available care foundation from future rituals", async () => {
  const page = await readFile(path.join(root, "src/app/services/page.tsx"), "utf8");

  assert.match(page, /availableNow/);
  assert.match(page, /freeNow/);
  assert.match(page, /<ComingSoonNotice/);
  assert.match(page, /services-soul__soon-badge/);
  assert.doesNotMatch(page, /carePrice/);
  assert.doesNotMatch(page, /href=\{s\.href\}/);
});

test("every future service is explicitly marked soon in every locale", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const services = JSON.parse(
      await readFile(path.join(root, `messages/${locale}/static.json`), "utf8"),
    ).services;

    assert.ok(services.soon);
    assert.ok(services.futureNoticeText);
    assert.equal(Object.keys(services.currentFeatures).length, 4);
    assert.doesNotMatch(services.careDescription, /subscription|subskrypcja|підписка|подписка|abo/i);
  }
});
