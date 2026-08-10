import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("future gift concierge is explicitly marked as coming soon and cannot be used", async () => {
  const page = await readFile(new URL("../src/app/gift/start/StartPageContent.tsx", import.meta.url), "utf8");
  const notice = await readFile(new URL("../src/components/ui/ComingSoonNotice.tsx", import.meta.url), "utf8");

  assert.match(page, /<ComingSoonNotice/);
  assert.match(page, /<fieldset disabled aria-describedby="gift-future-description"/);
  assert.match(page, /aria-disabled="true"/);
  assert.match(notice, /coming-soon-notice__badge/);
});

test("coming-soon copy exists in every supported locale", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const messages = JSON.parse(
      await readFile(new URL(`../messages/${locale}/gift.json`, import.meta.url), "utf8"),
    );
    assert.ok(messages.future.badge);
    assert.ok(messages.future.title);
    assert.ok(messages.future.description);
  }
});
