import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("birth year migration stores only a canonical confirmed year", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20261008162935_add_people_birth_year.sql", import.meta.url), "utf8");
  assert.match(sql, /add column birth_year integer/i);
  assert.match(sql, /set birth_year = extract\(year from birthday\)::integer/i);
  assert.doesNotMatch(sql, /current_age|turning_age|age_updated_at/i);
});
