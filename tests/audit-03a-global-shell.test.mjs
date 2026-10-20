import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { shouldApplyInitialAuthResult, shouldApplyProfileResult } from "../src/components/authRace.ts";
import { shouldRestoreProfileFocus } from "../src/components/profileMenuBehavior.ts";

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

test("profile dropdown uses ordinary links and restores focus only for Escape", async () => {
  const header = await readFile(path.join(root, "src/components/Header.tsx"), "utf8");
  assert.match(header, /profileButtonRef\.current\?\.focus\(\)/);
  assert.match(header, /event\.key === "Escape"/);
  assert.doesNotMatch(header, /aria-haspopup/);
  assert.match(header, /aria-expanded=\{profileOpen\}/);
  assert.match(header, /aria-controls="happydate-profile-menu"/);
  assert.doesNotMatch(header, /role="menu"|role="menuitem"/);
  assert.match(header, /profileFirstItemRef/);
  assert.match(header, /onClick=\{\(\) => setProfileOpen\(false\)\}/);
  assert.match(header, /await supabase\.auth\.signOut\(\); setProfileOpen\(false\)/);
  const outsideHandler = header.slice(header.indexOf("const closeOnOutsidePointer"), header.indexOf("window.addEventListener(\"keydown\""));
  assert.doesNotMatch(outsideHandler, /profileButtonRef\.current\?\.focus/);
});

test("profile dropdown restores focus only after Escape", () => {
  assert.equal(shouldRestoreProfileFocus("escape"), true);
  assert.equal(shouldRestoreProfileFocus("outside-pointer"), false);
});

test("AuthProvider settles initial auth errors and ignores stale profile results", async () => {
  const source = await readFile(path.join(root, "src/components/AuthProvider.tsx"), "utf8");
  assert.match(source, /getUser\(\)[\s\S]*?\.catch\(\(\) =>/);
  assert.match(source, /setUser\(null\); setLoading\(false\)/);
  assert.match(source, /profileRequestRef/);
  assert.match(source, /shouldApplyProfileResult\(requestId, profileRequestRef\.current, requestedUserId/);
  assert.match(source, /authVersionRef/);
  assert.match(source, /shouldApplyInitialAuthResult/);
  assert.match(source, /listener\.subscription\.unsubscribe\(\)/);
});

test("auth result guards reject stale initial sessions and profile responses", () => {
  assert.equal(shouldApplyInitialAuthResult(3, 3), true);
  assert.equal(shouldApplyInitialAuthResult(3, 4), false);
  assert.equal(shouldApplyProfileResult(8, 8, "user-a", "user-a"), true);
  assert.equal(shouldApplyProfileResult(8, 9, "user-a", "user-a"), false);
  assert.equal(shouldApplyProfileResult(8, 8, "user-a", "user-b"), false);
});

test("mobile legal links remain defined for guest and authenticated shells", async () => {
  const navigation = await readFile(path.join(root, "src/i18n/shellNavigation.ts"), "utf8");
  const layout = await readFile(path.join(root, "src/app/layout.tsx"), "utf8");
  for (const href of ["/contact", "/regulamin", "/privacy"]) assert.match(navigation, new RegExp(`href: "${href}"`));
  assert.match(layout, /<Footer \/>/);
  assert.match(layout, /className="hidden md:block"/);
});
