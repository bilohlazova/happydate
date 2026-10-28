import test from "node:test";
import assert from "node:assert/strict";
import { inspect } from "node:util";
import { assertEnvironmentSafety } from "../src/lib/supabase/environmentSafety.ts";
import { resolveSupabasePublicConfig } from "../src/lib/supabase/publicConfig.ts";
import { getAssistantEnvironmentStatus } from "../src/lib/assistant/chatEnvironment.ts";
import { createConfiguredAssistantRateLimiter } from "../src/lib/assistant/rateLimiter.ts";
const token = (role, ref = "xgelazzdgluuenqkymox") => `e30.${Buffer.from(JSON.stringify({ role, ref })).toString("base64url")}.synthetic`;
const safe = { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "fix/onboarding-survey-safe-ui", NEXT_PUBLIC_SUPABASE_URL: "https://xgelazzdgluuenqkymox.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: token("anon") };

test("A: invalid URL errors contain variable/category only, no input or cause", () => {
  for (const VERCEL_ENV of ["preview", "production", undefined]) {
    assert.throws(() => assertEnvironmentSafety({ ...safe, VERCEL_ENV, NEXT_PUBLIC_SUPABASE_URL: "invalid-secret-canary" }), error => {
      assert.match(error.message, /NEXT_PUBLIC_SUPABASE_URL/);
      assert.equal(error.cause, undefined);
      assert.equal(error.input, undefined);
      assert.doesNotMatch(inspect(error, { showHidden: true }), /invalid-secret-canary/);
      return true;
    });
  }
});
test("B: public secrets and privileged JWTs reject surrounding whitespace", () => {
  for (const value of ["sb_secret_synthetic", token("service_role"), token("supabase_admin"), "sk-proj-synthetic", "-----BEGIN PRIVATE KEY-----\nsynthetic"]) {
    for (const padded of [value, `  ${value}\n`]) {
      assert.throws(() => assertEnvironmentSafety({ NEXT_PUBLIC_OTHER: padded }));
    }
  }
});
test("C: explicit empty canonical key disables config instead of falling back", () => {
  for (const value of ["", "  "]) {
    const env = { ...safe, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: value };
    assert.equal(resolveSupabasePublicConfig(env), null);
    assert.throws(() => assertEnvironmentSafety(env));
  }
  assert.equal(resolveSupabasePublicConfig(safe).key, safe.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  assert.doesNotThrow(() => assertEnvironmentSafety(safe));
  for (const value of [undefined, "", "  "]) {
    const env = { ...safe, NEXT_PUBLIC_SUPABASE_ANON_KEY: value };
    assert.equal(resolveSupabasePublicConfig(env), null);
    assert.throws(() => assertEnvironmentSafety(env));
  }
});
test("D: Preview rejects noncanonical URL components", () => {
  for (const url of [
    "https://user:synthetic@xgelazzdgluuenqkymox.supabase.co",
    `${safe.NEXT_PUBLIC_SUPABASE_URL}?secret=synthetic`, `${safe.NEXT_PUBLIC_SUPABASE_URL}#synthetic`,
    `${safe.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`, `${safe.NEXT_PUBLIC_SUPABASE_URL}:444`,
    "http://xgelazzdgluuenqkymox.supabase.co", "https://yzcvdspiiiaidsdripxr.supabase.co",
  ]) assert.throws(() => assertEnvironmentSafety({ ...safe, NEXT_PUBLIC_SUPABASE_URL: url }));
});
test("Production and local configurations are independent from Preview restrictions", () => {
  const production = { NEXT_PUBLIC_SUPABASE_URL: "https://yzcvdspiiiaidsdripxr.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: token("anon", "yzcvdspiiiaidsdripxr"), OPENAI_API_KEY: "synthetic" };
  assert.doesNotThrow(() => assertEnvironmentSafety({ ...production, VERCEL_ENV: "production" }));
  assert.throws(() => assertEnvironmentSafety({ ...safe, VERCEL_ENV: "production" }));
  assert.throws(() => assertEnvironmentSafety({ ...production, VERCEL_ENV: "production", NEXT_PUBLIC_SUPABASE_ANON_KEY: token("service_role", "yzcvdspiiiaidsdripxr") }));
  assert.doesNotThrow(() => assertEnvironmentSafety({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local" }));
});
test("empty Sensitive overrides remain disabled without modifying or falling back", () => {
  const env = { ...safe, OPENAI_API_KEY: "", SUPABASE_SERVICE_ROLE_KEY: "", UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "" };
  const before = { ...env };
  assert.doesNotThrow(() => assertEnvironmentSafety(env));
  assert.deepEqual(env, before);
  assert.equal(resolveSupabasePublicConfig(env).url, safe.NEXT_PUBLIC_SUPABASE_URL);
  assert.equal(getAssistantEnvironmentStatus(env).openAiConfigured, false);
  assert.equal(getAssistantEnvironmentStatus(env).upstashConfigured, false);
  assert.equal(createConfiguredAssistantRateLimiter(env, "production"), null);
});
