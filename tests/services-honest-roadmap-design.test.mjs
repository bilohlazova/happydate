import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("services separates the available foundation from future services", async () => {
  const page = await readFile(path.join(root, "src/app/services/page.tsx"), "utf8");

  assert.match(page, /getServicesTranslations\("services"\)/);
  assert.match(page, /current\.badge/);
  assert.match(page, /current\.cta/);
  assert.match(page, /future\.status/);
  assert.match(page, /services-soul__soon-badge/);
  assert.match(page, /listen.*groupMessage.*sharedGift.*kindness.*heavenMessage/s);
  assert.doesNotMatch(page, /carePrice|freeNow|<ComingSoonNotice/);
  assert.doesNotMatch(page, /checkout|pricing|subscription|purchase/i);
  assert.equal((page.match(/<Link href=/g) ?? []).length, 1);
});

test("the available foundation and five future services are localized in every locale", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const services = JSON.parse(
      await readFile(path.join(root, `messages/${locale}/services.json`), "utf8"),
    );

    assert.ok(services.current.badge);
    assert.ok(services.current.cta);
    assert.equal(Object.keys(services.current.features).length, 4);
    assert.equal(Object.keys(services.future).filter((key) => !["eyebrow", "title", "description", "status"].includes(key)).length, 5);
    assert.ok(services.future.status);
    for (const key of ["listen", "groupMessage", "sharedGift", "kindness", "heavenMessage"]) {
      assert.ok(services.future[key].title);
      assert.ok(services.future[key].description);
      assert.doesNotMatch(services.future[key].description, /checkout|pricing|subscription|purchase|payment/i);
    }
  }
});
