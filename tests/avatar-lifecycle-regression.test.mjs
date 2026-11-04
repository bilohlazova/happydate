import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const hook = await readFile(new URL("../src/hooks/useAvatarUpload.ts", import.meta.url), "utf8");
const profile = await readFile(new URL("../src/app/(app)/profile/page.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("avatar actions have disjoint desktop/mobile hit targets", () => {
  assert.match(profile, /className="pr-avatar-actions"/);
  assert.match(profile, /className="pr-avatar-remove"/);
  assert.match(styles, /\.pr-avatar-actions\s*\{[\s\S]*flex-direction:\s*column/);
  assert.match(styles, /\.pr-avatar-wrap\s*\{[\s\S]*margin-right:\s*42px/);
  assert.doesNotMatch(styles, /\.pr-avatar-edit::before/);
});

test("persist failure cleans only the newly uploaded object", () => {
  assert.ok(hook.indexOf("await onSuccess(filePath)") < hook.indexOf("await removeAvatarObject(filePath)"));
  assert.match(hook, /cleanup failed/);
  assert.match(hook, /removeAvatarObject\(filePath\)/);
});

test("old-object cleanup is verified immediately and never runs before persist", () => {
  assert.ok(hook.indexOf("await onSuccess(filePath)") < hook.indexOf("removeAvatarObject(currentPath)"));
  assert.match(hook, /bucket\.list\(folder, \{ search: name, limit: 100 \}\)/);
  assert.match(hook, /object is still present/);
});

test("refresh failure cannot roll back an already persisted avatar", () => {
  const persist = profile.indexOf("supabase.from(\"profiles\").update({ avatar_url: filePath })");
  const localState = profile.indexOf("setAvatarPath(filePath)");
  const refresh = profile.indexOf("await refreshAvatar()", localState);
  assert.ok(persist >= 0 && persist < localState && localState < refresh);
  assert.match(profile.slice(localState, refresh + 120), /try\s*\{/);
  assert.match(profile.slice(localState, refresh + 180), /catch/);
});

test("remove action uses the same verified cleanup and tolerates refresh failure", () => {
  assert.match(profile, /await removeAvatarObject\(previous\)/);
  assert.match(profile, /try \{ await refreshAvatar\(\); \} catch/);
});
