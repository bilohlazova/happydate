import test from "node:test";
import assert from "node:assert/strict";
import { inspect } from "node:util";
import { assertEnvironmentSafety, PR14_BRANCH, PR14_POLICY_MARKER } from "../src/lib/supabase/environmentSafety.ts";
import { VERIFIED_STAGING_PUBLISHABLE_KEYS } from "../src/lib/supabase/verifiedStagingPublishableKeys.ts";
import { resolveSupabasePublicConfig } from "../src/lib/supabase/publicConfig.ts";
const jwt = (role = "anon", ref = "xgelazzdgluuenqkymox") =>
  `e30.${Buffer.from(JSON.stringify({ role, ref })).toString("base64url")}.synthetic`;
const staging = { NEXT_PUBLIC_SUPABASE_URL: "https://xgelazzdgluuenqkymox.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt() };
const pr14 = { ...staging, VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: PR14_BRANCH };
test("PR14 anon and independently verified Staging publishable keys enforce isolation", () => {
  assert.equal(assertEnvironmentSafety(pr14), "pr14-preview-isolated");
  assert.ok(VERIFIED_STAGING_PUBLISHABLE_KEYS.length > 0);
  for (const key of VERIFIED_STAGING_PUBLISHABLE_KEYS) {
    const env = { ...pr14, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key };
    assert.equal(assertEnvironmentSafety(env), "pr14-preview-isolated");
    assert.equal(resolveSupabasePublicConfig(env).key, key);
  }
  assert.throws(() => assertEnvironmentSafety({ ...pr14, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_unverified" }));
});
test("other Preview accepts publishable and separate provider credentials without claiming isolation", () => {
  const env = { ...staging, VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "codex/staging-block-b",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic", OPENAI_API_KEY: "synthetic",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic", UPSTASH_REDIS_REST_URL: "https://redis.example", UPSTASH_REDIS_REST_TOKEN: "synthetic" };
  assert.equal(assertEnvironmentSafety(env), "other-preview-unverified");
  // This temporary policy deliberately does NOT certify other Preview backends.
  assert.equal(assertEnvironmentSafety({ ...env, NEXT_PUBLIC_SUPABASE_URL: "https://yzcvdspiiiaidsdripxr.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt("anon", "yzcvdspiiiaidsdripxr") }), "other-preview-unverified");
});
test("universal public-secret rejection applies to every context, including unknown", () => {
  for (const context of [{}, { VERCEL_ENV: "production" }, { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "other" }, pr14]) {
    for (const key of [" sb_secret_synthetic ", jwt("service_role"), " sk-proj-synthetic "]) {
      assert.throws(() => assertEnvironmentSafety({ ...context, NEXT_PUBLIC_OTHER: key }), error => {
        assert.doesNotMatch(inspect(error, { showHidden: true }), /sb_secret_synthetic|sk-proj-synthetic/);
        return true;
      });
    }
  }
});
test("Production uses VERCEL_ENV, never NODE_ENV or the PR14 Git ref", () => {
  const env = { VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: PR14_BRANCH, NEXT_PUBLIC_SUPABASE_URL: "https://yzcvdspiiiaidsdripxr.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt("anon", "yzcvdspiiiaidsdripxr"), OPENAI_API_KEY: "synthetic", SUPABASE_SERVICE_ROLE_KEY: "synthetic" };
  assert.equal(assertEnvironmentSafety(env), "production-config-checked");
  assert.equal(assertEnvironmentSafety({ ...staging, NODE_ENV: "production", OPENAI_API_KEY: "synthetic" }), "local-unverified");
});
test("unknown Vercel context cannot silently skip PR14 policy", () => {
  for (const env of [
    { ...staging, VERCEL_ENV: "preview" },
    { ...staging, VERCEL: "1" },
    { ...staging, VERCEL_GIT_COMMIT_REF: PR14_BRANCH },
    { ...pr14, VERCEL_ENV: "unexpected" },
  ]) assert.throws(() => assertEnvironmentSafety(env));
  assert.equal(assertEnvironmentSafety({ ...staging, VERCEL_ENV: "unexpected" }), "unknown-context-unverified");
});
test("explicit branch-scoped marker can replace missing ref but never a contradictory context", () => {
  const env = { ...staging, VERCEL_ENV: "preview", HAPPYDATE_PREVIEW_POLICY: PR14_POLICY_MARKER };
  assert.equal(assertEnvironmentSafety(env), "pr14-preview-isolated");
  for (const override of [
    { VERCEL_GIT_COMMIT_REF: "other" }, { VERCEL_ENV: "production" }, { VERCEL_ENV: undefined },
    { HAPPYDATE_PREVIEW_POLICY: "unknown-synthetic-canary" },
  ]) assert.throws(() => assertEnvironmentSafety({ ...env, ...override }), error => {
    assert.doesNotMatch(inspect(error, { showHidden: true }), /unknown-synthetic-canary/);
    return true;
  });
});
test("matching empty publishable behavior is retained for PR14", () => {
  for (const key of ["", "  "]) {
    const env = { ...pr14, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key };
    assert.equal(resolveSupabasePublicConfig(env), null);
    assert.throws(() => assertEnvironmentSafety(env));
  }
});
