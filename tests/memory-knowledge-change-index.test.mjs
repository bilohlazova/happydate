import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Knowledge change history indexes the Person foreign-key side", async () => {
  const sql = await readFile(
    new URL(
      "../supabase/migrations/20260816120306_index_memory_knowledge_changes_person_fk.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(
    sql,
    /create index if not exists memory_knowledge_changes_person_id_idx\s+on public\.memory_knowledge_changes \(person_id\)/i,
  );
  assert.doesNotMatch(sql, /drop|delete|truncate|alter table/i);
});
