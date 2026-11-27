import test from "node:test";
import assert from "node:assert/strict";
import { assertEnvironmentSafety } from "../src/lib/supabase/environmentSafety.ts";
const jwt = (role, ref) => `e30.${Buffer.from(JSON.stringify({role, ref})).toString("base64url")}.test`;
const safe = { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "fix/onboarding-survey-safe-ui", NEXT_PUBLIC_SUPABASE_URL: "https://xgelazzdgluuenqkymox.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt("anon", "xgelazzdgluuenqkymox") };
test("isolated Preview passes without contacting services", () => assert.doesNotThrow(() => assertEnvironmentSafety(safe)));
test("Preview rejects Production, mismatched and opaque public keys", () => {
  for (const override of [
    {NEXT_PUBLIC_SUPABASE_URL: "https://yzcvdspiiiaidsdripxr.supabase.co"},
    {NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt("anon", "yzcvdspiiiaidsdripxr")},
    {NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_unverified"},
  ]) assert.throws(() => assertEnvironmentSafety({...safe, ...override}));
});
test("both selected and shadowed public credentials are checked", () => {
  for (const value of [jwt("service_role", "xgelazzdgluuenqkymox"), "sb_secret_test"]) {
    assert.throws(() => assertEnvironmentSafety({...safe, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test", NEXT_PUBLIC_SUPABASE_ANON_KEY: value}));
    assert.throws(() => assertEnvironmentSafety({NEXT_PUBLIC_OTHER: value}));
  }
});
test("Preview fails closed for inherited credentials without leaking them", () => {
  for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "OPENAI_API_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "RESEND_API_KEY", "REPLICATE_API_TOKEN"]) {
    assert.throws(() => assertEnvironmentSafety({...safe, [name]: "secret-canary"}), error => !error.message.includes("secret-canary"));
    assert.doesNotThrow(() => assertEnvironmentSafety({...safe, [name]: ""}));
  }
});
test("Production retains its integration contract", () => assert.doesNotThrow(() => assertEnvironmentSafety({VERCEL_ENV:"production", OPENAI_API_KEY:"test"})));
