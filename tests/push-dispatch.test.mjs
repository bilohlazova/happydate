import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const migration = await readFile(path.join(root, "supabase/migrations/20260804161414_add_push_dispatch_claims.sql"), "utf8");
const handler = await readFile(path.join(root, "supabase/functions/dispatch-push-reminders/index.ts"), "utf8");
const providers = await readFile(path.join(root, "supabase/functions/dispatch-push-reminders/push-providers.ts"), "utf8");
const config = await readFile(path.join(root, "supabase/config.toml"), "utf8");

test("push outbox has bounded retry scheduling and an efficient dispatch index", () => {
  assert.match(migration, /add column next_attempt_at timestamptz/i);
  assert.match(migration, /where channel = 'push' and status in \('queued', 'failed'\)/i);
  assert.match(handler, /const MAX_ATTEMPTS = 3/);
  assert.match(handler, /\.eq\("attempt_count", candidate\.attempt_count\)/);
  assert.match(handler, /status: "processing"/);
  assert.match(handler, /processing_timeout/);
});

test("dispatcher requires a secret key and never accepts a publishable caller", () => {
  assert.match(handler, /withSupabase\(\{ auth: "secret" \}/);
  assert.match(config, /\[functions\.dispatch-push-reminders\][\s\S]*?verify_jwt = false/);
  assert.doesNotMatch(handler, /auth:\s*\[[^\]]*publishable/);
});

test("providers use FCM HTTP v1 and token-authenticated APNs", () => {
  assert.match(providers, /firebase\.messaging/);
  assert.match(providers, /fcm\.googleapis\.com\/v1\/projects/);
  assert.match(providers, /api\.push\.apple\.com/);
  assert.match(providers, /api\.sandbox\.push\.apple\.com/);
  assert.match(providers, /apns-push-type/);
  assert.match(providers, /signedJwt/);
});

test("invalid provider tokens are disabled without logging token values", () => {
  assert.match(providers, /UNREGISTERED/);
  assert.match(providers, /BadDeviceToken/);
  assert.match(handler, /update\(\{ enabled: false \}\)/);
  assert.doesNotMatch(handler, /console\.log\([^\n]*(device|token)/i);
  assert.doesNotMatch(providers, /console\./);
});
