import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

test("migrations do not provision retired future-service data surfaces", async () => {
  const directory = new URL("../supabase/migrations/", import.meta.url);
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql"));
  const sql = (await Promise.all(files.map((file) => readFile(new URL(file, directory), "utf8")))).join("\n");
  assert.doesNotMatch(sql, /create\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?(?:heaven_messages|good_deeds|gift_requests)\b/i);
  assert.doesNotMatch(sql, /(?:heaven-videos|heaven_videos)/i);
});

test("future-service Supabase audit records the verified production boundary", async () => {
  const audit = await readFile(new URL("../docs/security/future-services-supabase-audit.md", import.meta.url), "utf8");
  for (const surface of ["heaven_messages", "good_deeds", "gift_requests", "heaven-videos"]) {
    assert.match(audit, new RegExp(surface));
  }
  assert.match(audit, /No destructive database operation/);
  assert.match(audit, /authenticated ownership and RLS/);
});
