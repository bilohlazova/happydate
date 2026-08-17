import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const config = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");

test("Next applies the security policy to every route and hides framework disclosure", () => {
  assert.match(config, /source: "\/:path\*"/);
  assert.match(config, /poweredByHeader: false/);
  for (const header of [
    "Content-Security-Policy",
    "Referrer-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "X-Permitted-Cross-Domain-Policies",
    "Permissions-Policy",
  ]) {
    assert.match(config, new RegExp(header));
  }
});

test("CSP blocks framing, plugins and unexpected data exfiltration", () => {
  assert.match(config, /default-src 'self'/);
  assert.match(config, /base-uri 'self'/);
  assert.match(config, /object-src 'none'/);
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(config, /form-action 'self'/);
  assert.match(config, /connect-src 'self' https:\/\/\*\.supabase\.co wss:\/\/\*\.supabase\.co/);
  assert.doesNotMatch(config, /connect-src 'self' https:(?:\s|["'])/, "connect-src must not allow every HTTPS origin");
  assert.doesNotMatch(config, /default-src[^\n]*\*/m);
});

test("production CSP does not require eval and upgrades insecure requests", () => {
  assert.match(config, /isProduction \? "" : " 'unsafe-eval'"/);
  assert.match(config, /isProduction \? \["upgrade-insecure-requests"\]/);
});
