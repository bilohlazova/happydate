import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Profile has one page heading and a shared account-center hierarchy", async () => {
  const source = await readFile(new URL("../src/app/(app)/profile/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
  assert.match(source, /className="pr-page-intro"/);
  assert.match(source, /<h1>\{translate\("title"\)\}<\/h1>/);
  assert.match(source, /<h2 className="pr-hero__name">/);
  assert.match(css, /\.pr-page-intro\s*\{/);
  assert.match(css, /\.pr-row--danger/);
});
