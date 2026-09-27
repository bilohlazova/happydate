import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serverUrl = new URL("../src/lib/happy/ideas.server.ts", import.meta.url);
const routeUrl = new URL("../src/app/api/happy/ideas/[id]/[response]/route.ts", import.meta.url);
const ideasMigration = new URL("../supabase/migrations/20260927095351_create_happy_ideas.sql", import.meta.url);

test("Happy Idea responses are authenticated, owned, conditional, and server-only", async () => {
  const [server, route, migration] = await Promise.all([readFile(serverUrl, "utf8"), readFile(routeUrl, "utf8"), readFile(ideasMigration, "utf8")]);
  assert.match(server, /import "server-only"/);
  assert.match(server, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(route, /authenticateHappyLearningRequest/);
  assert.match(route, /status: 401/);
  assert.match(route, /status: 400/);
  assert.match(route, /status: result\.kind === "not_found" \? 404 : result\.kind === "conflict" \? 409 : 503/);
  assert.match(server, /\.eq\("id", ideaId\)\.eq\("user_id", userId\)\.in\("status", \["new", "shown"\]\)/);
  assert.match(server, /status: target, responded_at:/);
  assert.match(server, /reread\.data\.status === target/);
  assert.match(server, /return \{ kind: "conflict" \}/);
  assert.match(migration, /grant select on table public\.happy_ideas to authenticated/);
  assert.doesNotMatch(migration, /grant\s+(?:select, )?update on table public\.happy_ideas to authenticated/i);
});
