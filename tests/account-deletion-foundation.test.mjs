import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("account deletion verifies the bearer user and exact email confirmation", async () => {
  const route = await readFile(path.join(root, "src/app/api/account/delete/route.ts"), "utf8");
  assert.match(route, /authorization\.startsWith\("Bearer "\)/);
  assert.match(route, /verifier\.auth\.getUser\(accessToken\)/);
  assert.match(route, /MAX_AUTH_AGE_MS = 30 \* 60 \* 1000/);
  assert.match(route, /user\.last_sign_in_at/);
  assert.match(route, /reauthentication_required/);
  assert.match(route, /confirmation\.toLocaleLowerCase\(\) !== user\.email\.toLocaleLowerCase\(\)/);
  assert.match(route, /Cache-Control": "no-store"/);
  assert.doesNotMatch(route, /service_role|SUPABASE_SERVICE_ROLE_KEY|error\.message/);
});

test("account deletion removes every owner-prefixed bucket before the auth cascade", async () => {
  const service = await readFile(path.join(root, "src/lib/account/accountDeletion.server.ts"), "utf8");
  for (const bucket of ["avatars", "memory-images", "memory-audio"]) assert.match(service, new RegExp(`"${bucket}"`));
  assert.match(service, /listOwnedStorageObjects\(client, bucket, userId\)/);
  assert.match(service, /client\.storage\.from\(bucket\)\.remove\(batch\)/);
  assert.match(service, /admin\.auth\.admin\.deleteUser\(userId, false\)/);
  assert.ok(service.indexOf("removeOwnedStorageObjects(admin, userId)") < service.indexOf("admin.auth.admin.deleteUser"));
  assert.match(service, /MAX_STORAGE_OBJECTS/);
  assert.match(service, /MAX_STORAGE_DIRECTORIES/);
});

test("destructive UI requires acknowledgement and typed account email", async () => {
  const page = await readFile(path.join(root, "src/app/(app)/settings/delete-account/page.tsx"), "utf8");
  assert.match(page, /understood && confirmationMatches/);
  assert.match(page, /href="\/settings\/export"/);
  assert.match(page, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(page, /supabase\.auth\.signOut\(\{ scope: "local" \}\)/);
  assert.match(page, /auth\/login\?redirectTo=\/settings\/delete-account/);
});

test("account deletion copy exists in every locale", async () => {
  const keys = ["back", "title", "description", "pauseTitle", "pauseDescription", "exportFirst", "permanentTitle", "permanentDescription", "understand", "confirmLabel", "emailPlaceholder", "delete", "deleting", "reauthTitle", "reauthDescription", "reauthAction", "error"];
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const dictionary = JSON.parse(await readFile(path.join(root, "messages", locale, "profile.json"), "utf8"));
    for (const key of keys) assert.equal(typeof dictionary.deleteAccountSettings?.[key], "string", `${locale}:${key}`);
    for (const key of ["people", "memory", "files", "account"]) assert.equal(typeof dictionary.deleteAccountSettings?.items?.[key], "string", `${locale}:items.${key}`);
  }
});
