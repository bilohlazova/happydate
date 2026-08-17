import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);

test("production builds cannot bypass TypeScript errors", async () => {
  const config = await readFile(new URL("next.config.ts", ROOT), "utf8");
  assert.doesNotMatch(config, /ignoreBuildErrors\s*:\s*true/);
});

test("repository exposes repeatable lint, typecheck, and verification commands", async () => {
  const packageJson = JSON.parse(await readFile(new URL("package.json", ROOT), "utf8"));
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.scripts.lint, "eslint");
  assert.equal(packageJson.scripts.typecheck, "tsc --noEmit");
  assert.match(packageJson.scripts.verify, /npm run lint/);
  assert.match(packageJson.scripts.verify, /npm run typecheck/);
  assert.match(packageJson.scripts.verify, /npm test/);
});

test("ESLint uses the native Next.js flat configurations", async () => {
  const config = await readFile(new URL("eslint.config.mjs", ROOT), "utf8");
  assert.match(config, /eslint-config-next\/core-web-vitals/);
  assert.match(config, /eslint-config-next\/typescript/);
  assert.doesNotMatch(config, /FlatCompat/);
  assert.doesNotMatch(config, /"react-hooks\/(set-state-in-effect|refs|preserve-manual-memoization)"\s*:\s*"warn"/);
});
