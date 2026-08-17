import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);

test("production smoke command runs the built application rather than a dev server", async () => {
  const packageJson = JSON.parse(await readFile(new URL("package.json", ROOT), "utf8"));
  const script = await readFile(new URL("scripts/smoke-production.mjs", ROOT), "utf8");
  assert.equal(packageJson.scripts["smoke:production"], "node scripts/smoke-production.mjs");
  assert.match(script, /spawn\(process\.execPath, \[nextBin, "start"/);
  assert.doesNotMatch(script, /next dev/);
  assert.match(script, /NODE_ENV: "production"/);
});

test("production smoke covers public pages and security headers", async () => {
  const script = await readFile(new URL("scripts/smoke-production.mjs", ROOT), "utf8");
  for (const path of ["/about", "/privacy", "/auth/login", "/native-offline.html"]) {
    assert.match(script, new RegExp(path.replaceAll("/", "\\/")));
  }
  for (const header of ["content-security-policy", "x-content-type-options", "x-frame-options", "x-powered-by"]) {
    assert.match(script, new RegExp(header));
  }
  assert.match(script, /status, 404/);
});

test("production smoke exercises parser rejection and every retired privileged endpoint", async () => {
  const script = await readFile(new URL("scripts/smoke-production.mjs", ROOT), "utf8");
  assert.match(script, /\/api\/ai-chat/);
  assert.match(script, /\/api\/telemetry\/error/);
  assert.match(script, /status, 415/);
  for (const route of ["auto-release", "good-deed", "heaven-messages", "notify-gift", "replicate/webhook"]) {
    assert.match(script, new RegExp(route.replace("/", "\\/")));
  }
  assert.match(script, /status, 410/);
});
