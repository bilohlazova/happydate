import assert from "node:assert/strict";
import test from "node:test";
import { PR14_RUNTIME_SAFETY_PASS, shouldLogPr14RuntimeSafety } from "../src/lib/supabase/runtimeSafetyLog.ts";

const pr14 = { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "fix/onboarding-survey-safe-ui" };

test("marker is fixed and emitted only for isolated PR14 Preview", () => {
  assert.equal(PR14_RUNTIME_SAFETY_PASS, "HAPPYDATE_PR14_RUNTIME_SAFETY_PASS");
  assert.equal(shouldLogPr14RuntimeSafety("pr14-preview-isolated", pr14), true);
});

test("Production and other Preview never qualify for the marker", () => {
  assert.equal(shouldLogPr14RuntimeSafety("production-config-checked", { VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: pr14.VERCEL_GIT_COMMIT_REF }), false);
  assert.equal(shouldLogPr14RuntimeSafety("other-preview-unverified", { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "codex/staging-block-b" }), false);
  assert.equal(shouldLogPr14RuntimeSafety("pr14-preview-isolated", { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "codex/other" }), false);
});

test("local and incomplete contexts never qualify", () => {
  assert.equal(shouldLogPr14RuntimeSafety("local-unverified", { HAPPYDATE_LOCAL_EXECUTION: "1" }), false);
  assert.equal(shouldLogPr14RuntimeSafety("pr14-preview-isolated", { VERCEL_ENV: "preview" }), false);
});
