import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("about presents HappyDate as a person-centred care system", async () => {
  const page = await readFile(path.join(root, "src/app/about/page.tsx"), "utf8");

  assert.match(page, /about-soul__orbit/);
  assert.match(page, /personSystem/);
  assert.match(page, /\["◌", "memory"\]/);
  assert.match(page, /\["♡", "care"\]/);
  assert.match(page, /\["✦", "conversation"\]/);
  assert.match(page, /t\(`brains\.\$\{key\}\.title`\)/);
  assert.match(page, /<ComingSoonNotice/);
});

test("about soul and future boundary are localized for every locale", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const messages = JSON.parse(
      await readFile(path.join(root, `messages/${locale}/static.json`), "utf8"),
    );
    const about = messages.about;

    assert.equal(Object.keys(about.brains).length, 3);
    assert.equal(Object.keys(about.personSystem).length, 6);
    assert.ok(about.future.badge);
    assert.ok(about.startAction);
  }
});
