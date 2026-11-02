import test from "node:test";
import assert from "node:assert/strict";
import { inspect } from "node:util";
import { assertEnvironmentSafety, PR14_BRANCH, PR14_POLICY_MARKER } from "../src/lib/supabase/environmentSafety.ts";
const anon = `e30.${Buffer.from(JSON.stringify({ role: "anon", ref: "xgelazzdgluuenqkymox" })).toString("base64url")}.synthetic`;
const staging = { NEXT_PUBLIC_SUPABASE_URL: "https://xgelazzdgluuenqkymox.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: anon };
test("no deployment identifiers fails closed, regardless of NODE_ENV", () => {
  for (const NODE_ENV of [undefined, "development", "production", "test"]) {
    assert.throws(() => assertEnvironmentSafety({ ...staging, NODE_ENV }), /execution_context_required/);
  }
});
test("VERCEL=1 and partial hosted identifiers cannot imply a branch policy", () => {
  for (const context of [{ VERCEL: "1" }, { VERCEL_GIT_COMMIT_REF: PR14_BRANCH }, { VERCEL_ENV: "preview" },
    { VERCEL_ENV: "unexpected" }, { VERCEL_URL: "synthetic.vercel.app" }, { VERCEL_DEPLOYMENT_ID: "dpl_synthetic" }]) {
    assert.throws(() => assertEnvironmentSafety({ ...staging, ...context }));
  }
});
test("explicit local execution works without implying backend isolation", () => {
  for (const NODE_ENV of ["development", "production"]) {
    assert.equal(assertEnvironmentSafety({ ...staging, HAPPYDATE_LOCAL_EXECUTION: "1", NODE_ENV }), "local-unverified");
  }
  assert.throws(() => assertEnvironmentSafety({ ...staging, HAPPYDATE_LOCAL_EXECUTION: "invalid-private-canary" }), error => {
    assert.doesNotMatch(inspect(error, { showHidden: true }), /invalid-private-canary/);
    return true;
  });
});
test("local opt-in cannot override hosted or branch-policy context", () => {
  for (const context of [{ VERCEL: "1" }, { VERCEL_ENV: "production" }, { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: PR14_BRANCH },
    { VERCEL_URL: "synthetic.vercel.app" }, { VERCEL_TARGET_ENV: "preview" }, { VERCEL_REGION: "iad1" },
    { HAPPYDATE_PREVIEW_POLICY: PR14_POLICY_MARKER }]) {
    assert.throws(() => assertEnvironmentSafety({ ...staging, ...context, HAPPYDATE_LOCAL_EXECUTION: "1" }), /local_context_conflict/);
  }
});
test("trusted branch-scoped policy marker enforces staging even without Vercel identifiers", () => {
  const env = { ...staging, HAPPYDATE_PREVIEW_POLICY: PR14_POLICY_MARKER };
  assert.equal(assertEnvironmentSafety(env), "pr14-preview-isolated");
  assert.throws(() => assertEnvironmentSafety({ ...env, OPENAI_API_KEY: "synthetic-private-canary" }), error => {
    assert.doesNotMatch(inspect(error, { showHidden: true }), /synthetic-private-canary/);
    return true;
  });
  for (const context of [{ VERCEL_ENV: "production" }, { VERCEL_ENV: "development" }, { VERCEL_ENV: "unknown" }, { VERCEL_GIT_COMMIT_REF: "other" }]) {
    assert.throws(() => assertEnvironmentSafety({ ...env, ...context }));
  }
});
