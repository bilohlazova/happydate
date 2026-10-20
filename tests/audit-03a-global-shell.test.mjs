import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("responsive header keeps mobile navigation through 767px", async () => {
  const header = await readFile(path.join(root, "src/components/Header.tsx"), "utf8");
  const css = await readFile(path.join(root, "src/app/globals.css"), "utf8");

  assert.match(header, /className="hidden items-center gap-1 text-sm md:flex"/);
  assert.match(header, /hd-mobile-menu-button text-xl text-slate-700 md:hidden/);
  assert.match(header, /happydate-mobile-menu[^\"]*md:hidden/);
  assert.doesNotMatch(header, /happydate-mobile-menu[^\"]*sm:hidden/);
  assert.match(css, /@media \(min-width: 768px\) \{\s*\.hd-mobile-menu-button \{\s*display: none;/);
  assert.doesNotMatch(css, /@media \(min-width: 640px\) \{\s*\.hd-mobile-menu-button/);
});

test("profile menu has a complete keyboard and navigation contract", async () => {
  const header = await readFile(path.join(root, "src/components/Header.tsx"), "utf8");
  assert.match(header, /profileButtonRef\.current\?\.focus\(\)/);
  assert.match(header, /event\.key === "Escape"/);
  assert.match(header, /aria-haspopup="menu"/);
  assert.match(header, /aria-expanded=\{profileOpen\}/);
  assert.match(header, /aria-controls="happydate-profile-menu"/);
  assert.match(header, /role="menu"/);
  assert.match(header, /profileFirstItemRef/);
  assert.match(header, /onClick=\{\(\) => setProfileOpen\(false\)\}/);
  assert.match(header, /await supabase\.auth\.signOut\(\); setProfileOpen\(false\)/);
});

test("AuthProvider settles initial auth errors and ignores stale profile results", async () => {
  const source = await readFile(path.join(root, "src/components/AuthProvider.tsx"), "utf8");
  assert.match(source, /getUser\(\)[\s\S]*?\.catch\(\(\) =>/);
  assert.match(source, /setUser\(null\); setLoading\(false\)/);
  assert.match(source, /profileRequestRef/);
  assert.match(source, /currentUserRef\.current\?\.id !== requestedUserId/);
  assert.match(source, /listener\.subscription\.unsubscribe\(\)/);
});

test("mobile legal links remain defined for guest and authenticated shells", async () => {
  const navigation = await readFile(path.join(root, "src/i18n/shellNavigation.ts"), "utf8");
  const layout = await readFile(path.join(root, "src/app/layout.tsx"), "utf8");
  for (const href of ["/contact", "/regulamin", "/privacy"]) assert.match(navigation, new RegExp(`href: "${href}"`));
  assert.match(layout, /<Footer \/>/);
  assert.match(layout, /className="hidden md:block"/);
});
