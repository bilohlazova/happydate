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

test("survey stores canonical kinds instead of localized labels", async () => {
  const source = await readFile(
    path.join(root, "src/app/survey/page.tsx"),
    "utf8"
  );
  assert.match(source, /label: d\.label\?\.trim\(\) \|\| d\.kind/);
  assert.match(source, /value="support">\{t\("support"\)\}/);
  assert.match(source, /value="celebration">\{t\("celebration"\)\}/);
});
