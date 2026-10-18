import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const registrationPath = new URL("../src/app/auth/register/RegisterPageContent.tsx", import.meta.url);
const migrationPath = new URL("../supabase/migrations/20261017112945_sync_profile_names_from_auth_metadata.sql", import.meta.url);
const profilePath = new URL("../src/app/(app)/profile/page.tsx", import.meta.url);

test("registration persists structured names in auth metadata before confirmation", async () => {
  const source = await readFile(registrationPath, "utf8");
  assert.match(source, /data:\s*\{\s*first_name:/s);
  assert.match(source, /last_name:\s*lastName\.trim\(\)/);
});

test("auth trigger creates the canonical profile without authorization metadata", async () => {
  const source = await readFile(migrationPath, "utf8");
  assert.match(source, /after insert on auth\.users/i);
  assert.match(source, /insert into public\.profiles \(id, first_name, last_name, full_name\)/i);
  assert.match(source, /revoke all on function private\.sync_profile_names_from_auth_metadata\(\)/i);
  assert.doesNotMatch(source, /raw_app_meta_data|auth\.jwt|create policy/i);
});

test("profile status is based on server completion markers, not points", async () => {
  const source = await readFile(profilePath, "utf8");
  assert.match(source, /is_completed, completed_at, reward_granted_at/);
  assert.match(source, /completed: Boolean\(row\?\.is_completed && row\?\.completed_at\)/);
  assert.doesNotMatch(source, /points\s*[>=]+\s*100/);
});

test("profile edit updates all canonical name fields and refreshes shared auth profile", async () => {
  const source = await readFile(profilePath, "utf8");
  assert.match(source, /first_name: canonicalFirstName/);
  assert.match(source, /last_name: canonicalLastName \|\| null/);
  assert.match(source, /full_name: canonicalFullName/);
  assert.match(source, /await refreshProfile\(\)/);
});
