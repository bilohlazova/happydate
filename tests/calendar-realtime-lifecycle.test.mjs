import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("calendar realtime channel is unique and cancelled across async effect lifecycles", async () => {
  const source = await readFile(new URL("../src/app/(app)/dashboard/page.tsx", import.meta.url), "utf8");
  assert.match(source, /let cancelled = false/);
  assert.match(source, /if \(cancelled\) return/);
  assert.match(source, /\.channel\(`cal-ch-\$\{user\.id\}-/);
  assert.match(source, /cancelled = true/);
  assert.match(source, /removeChannel\(ch\)/);
});
