import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("localized static route metadata uses next-intl", async () => {
  for (const file of [
    "src/app/about/page.tsx",
    "src/app/reviews/page.tsx",
    "src/app/services/page.tsx",
  ]) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.match(source, /generateMetadata/);
    assert.match(source, /getTranslations/);
  }
});

test("review bodies and author names remain untouched user content", async () => {
  const source = await readFile(
    path.join(root, "src/app/reviews/ReviewsClient.tsx"),
    "utf8"
  );
  assert.match(source, /\{r\.message\}/);
  assert.match(source, /\{r\.name\}/);
  assert.doesNotMatch(source, /t\([^)]*r\.(?:message|name)/);
  assert.match(source, /toLocaleDateString\(locale\)/);
});

test("legacy survey keeps preference values canonical and does not edit dates", async () => {
  const source = await readFile(
    path.join(root, "src/app/survey/page.tsx"),
    "utf8"
  );
  assert.match(source, /canonicalizeGiftPreference/);
  assert.match(source, /p_special_dates:\s*null/);
  assert.doesNotMatch(source, /value="support"|value="celebration"|d\.label/);
});
