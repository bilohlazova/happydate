import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(path.join(root, "src/components/PrivateSnapshotBoundary.tsx"), "utf8");
const registry = JSON.parse(source.match(/return (\[[^\]]+\])\s*\.some/)[1]);
const isPrivate = (p) => registry.some((r) => p === r || p.startsWith(`${r}/`));
// Pages that use auth by design but intentionally stay public (login/reset flows).
const PUBLIC_AUTH_PREFIXES = ["/auth"];

async function pages(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await pages(full, out);
    else if (e.name === "page.tsx") out.push(full);
  }
  return out;
}

test("SEC-01 registry covers static, dynamic and nested private routes", () => {
  for (const p of ["/people", "/people/abc", "/people/add", "/events/42", "/notes", "/dashboard", "/profile",
    "/settings", "/settings/sessions", "/settings/delete-account", "/gift/start", "/care/add-memory", "/survey",
    "/onboarding-preview"]) assert.ok(isPrivate(p), `${p} must be private`);
});

test("SEC-01 registry does not capture public look-alike or public pages", () => {
  for (const p of ["/", "/peoplex", "/care", "/about", "/services/asystent-ai", "/auth/login"]) {
    assert.ok(!isPrivate(p), `${p} must stay public`);
  }
});

test("SEC-01 every page that reads the Supabase client or auth state is private or explicitly public-auth", async () => {
  const appDir = path.join(root, "src/app");
  const uncovered = [];
  for (const file of await pages(appDir)) {
    const text = await readFile(file, "utf8");
    if (!/supabaseClient|useAuth\b/.test(text)) continue;
    const route = "/" + path.relative(appDir, path.dirname(file)).split(path.sep)
      .filter((s) => s && !/^\(.*\)$/.test(s)).join("/");
    const covered = isPrivate(route) || PUBLIC_AUTH_PREFIXES.some((x) => route === x || route.startsWith(`${x}/`));
    if (!covered) uncovered.push(route);
  }
  assert.deepEqual(uncovered, [], "New auth-reading routes must be added to isPrivateSnapshotRoute");
});
