import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("gift flow leads with care and explainable recommendations", async () => {
  const page = await readFile(new URL("../src/app/gift/start/StartPageContent.tsx", import.meta.url), "utf8");
  assert.match(page, /className={`gift-care-page/);
  assert.match(page, /gift-care-hero__glow/);
  assert.ok(page.indexOf("gift-care-recommendations") < page.indexOf("<GiftWorkspacePanel"));
  assert.match(page, /className="gift-care-recommendation-card"/);
});

test("gift hero copy is localized and does not promise delivery before the partner stage", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const messages = JSON.parse(
      await readFile(new URL(`../messages/${locale}/gift.json`, import.meta.url), "utf8"),
    );
    assert.ok(messages.hero.badge);
    assert.ok(messages.hero.title);
    assert.ok(messages.hero.subtitle);
    assert.doesNotMatch(messages.hero.subtitle, /deliver|delivery|dostaw|достав|liefer/i);
  }
});
