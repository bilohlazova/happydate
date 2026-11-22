import test from "node:test";
import assert from "node:assert/strict";
import { inspect } from "node:util";
import { assertEnvironmentSafety } from "../src/lib/supabase/environmentSafety.ts";
const jwt = (ref) => `e30.${Buffer.from(JSON.stringify({ role: "anon", ref })).toString("base64url")}.synthetic`;
const staging = { VERCEL_ENV: "preview", NEXT_PUBLIC_SUPABASE_URL: "https://xgelazzdgluuenqkymox.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt("xgelazzdgluuenqkymox") };
const strictBranches = ["fix/assistant-owned-person-over-100", "codex/release-readiness-audit"];
test("every Preview branch rejects Production Supabase, including normalized URL forms", () => {
  for (const branch of [...strictBranches, "other", "codex/staging-block-b"]) {
    for (const url of ["https://yzcvdspiiiaidsdripxr.supabase.co", "https://YZCVDSPIIIAIDSDRIPXR.supabase.co", "https://yzcvdspiiiaidsdripxr.supabase.co/", "https://yzcvdspiiiaidsdripxr.supabase.co./"]) {
      assert.throws(() => assertEnvironmentSafety({ ...staging, VERCEL_GIT_COMMIT_REF: branch, NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt("yzcvdspiiiaidsdripxr") }));
    }
  }
});
test("release and audit Previews require verified Staging config and disabled integrations", () => {
  for (const branch of strictBranches) {
    const env = { ...staging, VERCEL_GIT_COMMIT_REF: branch };
    assert.equal(assertEnvironmentSafety(env), "release-preview-isolated");
    for (const override of [{ NEXT_PUBLIC_SUPABASE_URL: "https://unknown.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt("unknown") }, { NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt("other") }, { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_unknown" }, { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" }, { NEXT_PUBLIC_SUPABASE_URL: "" }]) {
      assert.throws(() => assertEnvironmentSafety({ ...env, ...override }));
    }
    for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "OPENAI_API_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "RESEND_API_KEY", "REPLICATE_API_TOKEN"]) {
      assert.throws(() => assertEnvironmentSafety({ ...env, [name]: "private-regression-canary" }), error => !inspect(error, { showHidden: true }).includes("private-regression-canary"));
      assert.doesNotThrow(() => assertEnvironmentSafety({ ...env, [name]: "  " }));
    }
  }
});
