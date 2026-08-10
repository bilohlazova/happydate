import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("add person exposes one visible, accessible multi-source flow", async () => {
  const source = await readFile(new URL("../src/app/people/add/page.tsx", import.meta.url), "utf8");
  assert.match(source, /className={`add-person-page/);
  assert.match(source, /<ModeSwitcher/);
  assert.match(source, /Object\.keys\(MODE_COPY\)/);
  assert.match(source, /aria-current=\{selected \? "step" : undefined\}/);
  assert.match(source, /router\.replace\(`\/people\/add\?mode=\$\{nextMode\}`\)/);
  assert.match(source, /add-person-form-card/);
});
