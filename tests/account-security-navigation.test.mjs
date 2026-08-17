import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("profile security controls lead to working password, session and notification routes", async () => {
  const profile = await readFile(path.join(root, "src/app/(app)/profile/page.tsx"), "utf8");
  assert.match(profile, /changePassword"\), href: "\/auth\/reset"/);
  assert.match(profile, /activeSessions"\), href: "\/settings\/sessions"/);
  assert.match(profile, /translate\("notifications"\), href: "\/settings\/reminders"/);
});

test("session control preserves the current device and revokes only other sessions", async () => {
  const page = await readFile(path.join(root, "src/app/(app)/settings/sessions/page.tsx"), "utf8");
  assert.match(page, /supabase\.auth\.getUser\(\)/);
  assert.match(page, /supabase\.auth\.signOut\(\{ scope: "others" \}\)/);
  assert.doesNotMatch(page, /access_token|refresh_token|auth\.sessions/i);
});

test("session settings are complete in every supported locale", async () => {
  const keys = ["back", "title", "description", "currentTitle", "currentDescription", "lastSignIn", "unknownTime", "othersTitle", "othersDescription", "revokeOthers", "revoking", "done", "error", "tokenNote"];
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const dictionary = JSON.parse(await readFile(path.join(root, "messages", locale, "profile.json"), "utf8"));
    for (const key of keys) assert.equal(typeof dictionary.sessionSettings?.[key], "string", `${locale}:${key}`);
  }
});
