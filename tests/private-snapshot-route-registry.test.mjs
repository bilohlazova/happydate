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

// Transitive guard: a page may reach auth/Supabase only through child components. Every page whose
// import closure touches supabaseClient/useAuth must be private, or be listed here with the reason
// it stays public. A new route that is neither fails this test (fail-closed review gate).
const PUBLIC_WITH_OWN_OWNER_LOGIC = new Map([
  ["/", "guest home; owner snapshot gated by selectRenderableHomeSnapshot in HomePageClient"],
  ["/services/asystent-ai", "guest HappyBot; UserScopedChatAssistant resets per owner"],
  ["/reviews", "public published reviews; inserts a review row"],
]);
async function importsOf(file, text) {
  const out = [];
  for (const m of text.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
    const spec = m[1];
    const base = spec.startsWith("@/") ? path.join(root, "src", spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(file), spec) : null;
    if (!base) continue;
    for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
      try { const t = await readFile(base + ext, "utf8"); out.push([base + ext, t]); break; } catch { /* try next */ }
    }
  }
  return out;
}
async function reachesAuth(entry) {
  const seen = new Set(); const stack = [[entry, await readFile(entry, "utf8")]];
  while (stack.length) {
    const [file, text] = stack.pop();
    if (seen.has(file)) continue; seen.add(file);
    if (/supabaseClient|useAuth\b/.test(text)) return true;
    stack.push(...await importsOf(file, text));
  }
  return false;
}

test("SEC-01 every page that reaches auth through child components is private or explicitly public", async () => {
  const appDir = path.join(root, "src/app");
  const unreviewed = [];
  for (const file of await pages(appDir)) {
    const route = "/" + path.relative(appDir, path.dirname(file)).split(path.sep).filter((s) => s && !/^\(.*\)$/.test(s)).join("/");
    if (isPrivate(route) || PUBLIC_AUTH_PREFIXES.some((x) => route === x || route.startsWith(`${x}/`)) || PUBLIC_WITH_OWN_OWNER_LOGIC.has(route)) continue;
    if (await reachesAuth(file)) unreviewed.push(route);
  }
  assert.deepEqual(unreviewed, [], "Register the route as private or review and allowlist it with a reason");
});
