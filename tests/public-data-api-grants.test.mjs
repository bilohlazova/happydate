import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const migrationsDirectory = new URL("../supabase/migrations/", import.meta.url);
const grantsMigrationUrl = new URL(
  "../supabase/migrations/20260923172825_normalize_public_data_api_grants.sql",
  import.meta.url,
);

test("every migrated public table has an explicit Data API access decision", async () => {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const migrations = await Promise.all(files.map(async (file) => ({
    file,
    sql: await readFile(new URL(file, migrationsDirectory), "utf8"),
  })));
  const createdTables = migrations.flatMap(({ file, sql }, createdAt) => (
    [...sql.matchAll(/create table(?: if not exists)? public\.([a-z0-9_]+)/gi)]
      .map((match) => ({ table: match[1], createdAt, file }))
  ));

  for (const { table, createdAt, file } of createdTables) {
    // Tables may receive their ACL in a later centralized hardening migration
    // or alongside their own creation. In either case, require an explicit
    // revoke after creation, rather than assuming one historical migration is
    // the permanent home for every future table's ACL.
    const aclSinceCreation = migrations.slice(createdAt).map(({ sql }) => sql).join("\n");
    const revokeStatements = [...aclSinceCreation.matchAll(/revoke all on table\s+([\s\S]*?)\s+from\s+[^;]+;/gi)];
    assert.ok(
      revokeStatements.some((match) => new RegExp(`public\\.${table}\\b`, "i").test(match[1])),
      `missing explicit table privilege revoke for ${table} after ${file}`,
    );
  }
});

test("Data API grants expose no application table or RPC to anon", async () => {
  const sql = await readFile(grantsMigrationUrl, "utf8");
  assert.doesNotMatch(sql, /grant\s+[\s\S]*?\s+to\s+anon\b/i);
  assert.match(sql, /revoke all on table[\s\S]*from anon, authenticated, service_role;/i);
});

test("future public objects do not inherit broad Data API privileges", async () => {
  const sql = await readFile(grantsMigrationUrl, "utf8");

  assert.match(sql, /alter default privileges for role postgres in schema public\s+revoke select, insert, update, delete on tables from anon, authenticated, service_role/i);
  assert.match(sql, /alter default privileges for role postgres in schema public\s+revoke execute on functions from anon, authenticated, service_role/i);
  assert.match(sql, /alter default privileges for role postgres\s+revoke execute on functions from public/i);
  assert.match(sql, /alter default privileges for role postgres in schema public\s+revoke usage, select, update on sequences from anon, authenticated, service_role/i);
});

test("least-privilege exceptions remain explicit", async () => {
  const sql = await readFile(grantsMigrationUrl, "utf8");

  assert.match(sql, /grant select, insert on table[\s\S]*public\.user_wellbeing_checkins[\s\S]*public\.user_support_moments/i);
  assert.match(sql, /grant select on table public\.person_happy_conversations to authenticated/i);
  assert.match(sql, /grant select \([\s\S]*?\) on table public\.push_devices to authenticated/i);
  assert.match(sql, /grant insert \(user_id, channel, action\)[\s\S]*public\.knowledge_review_interactions/i);
  assert.match(sql, /grant execute on function public\.save_my_onboarding_survey[\s\S]*to authenticated/i);
  assert.match(sql, /revoke all on function public\.set_updated_at\(\) from public, anon, authenticated/i);
});
