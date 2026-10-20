import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isCurrentHomeLoad } from "../src/lib/home/homeLoadGuard.ts";
import { shouldShowHomeEmptyState } from "../src/components/home-dashboard/homeState.ts";

test("home load guard rejects stale owners and stale request versions", () => {
  assert.equal(isCurrentHomeLoad(3, 3, "user-a", "user-a"), true);
  assert.equal(isCurrentHomeLoad(2, 3, "user-a", "user-a"), false);
  assert.equal(isCurrentHomeLoad(3, 3, "user-a", "user-b"), false);
  assert.equal(isCurrentHomeLoad(3, 4, "user-a", null), false);
});

test("partial people/events errors never render the empty-state branch", () => {
  assert.equal(shouldShowHomeEmptyState(true, 0), true);
  assert.equal(shouldShowHomeEmptyState(true, 1), false);
});

test("loadHome preserves repository proactivity mode", async () => {
  const source = await readFile(new URL("../src/lib/home/loadHome.ts", import.meta.url), "utf8");
  assert.match(source, /proactivityMode:\s*data\.proactivityMode/);
});
