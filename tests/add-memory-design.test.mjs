import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("add memory presents structured person-first capture without changing persistence", async () => {
  const source = await readFile(new URL("../src/app/care/add-memory/page.tsx", import.meta.url), "utf8");
  assert.match(source, /className={`add-memory-page/);
  assert.match(source, /<PeopleSelect/);
  assert.match(source, /<fieldset className="add-memory-type-fieldset">/);
  assert.match(source, /aria-pressed=\{selected\}/);
  assert.match(source, /className="add-memory-privacy"/);
  assert.match(source, /await createKnowledge\(/);
  assert.match(source, /source: "manual"/);
});
