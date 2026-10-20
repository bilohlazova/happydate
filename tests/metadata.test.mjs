import assert from "node:assert/strict";
import test from "node:test";

import { getAppMetadata } from "../src/i18n/metadata.ts";

test("application metadata is localized for every supported locale", () => {
  const descriptions = new Map(
    ["pl", "uk", "en", "de", "ru"].map((locale) => [
      locale,
      getAppMetadata(locale).description,
    ]),
  );

  assert.equal(descriptions.size, 5);
  assert.deepEqual([...descriptions.values()].filter(Boolean).length, 5);
  assert.notEqual(descriptions.get("pl"), descriptions.get("uk"));
  assert.notEqual(descriptions.get("pl"), descriptions.get("en"));
  assert.notEqual(descriptions.get("pl"), descriptions.get("de"));
  assert.notEqual(descriptions.get("pl"), descriptions.get("ru"));

  for (const locale of descriptions.keys()) {
    assert.equal(getAppMetadata(locale).title, "HappyDate");
    assert.equal(getAppMetadata(locale).openGraph?.title, "HappyDate");
  }
});
