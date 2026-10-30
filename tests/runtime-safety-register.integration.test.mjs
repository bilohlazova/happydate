import assert from "node:assert/strict";
import test from "node:test";
import { register } from "../src/instrumentation.ts";

const STAGING_ANON = "eyJhbGciOiJub25lIn0.eyJyb2xlIjoiYW5vbiIsInJlZiI6InhnZWxhenpkZ2x1dWVucWt5bW94In0.sig";
const MARKER = "HAPPYDATE_PR14_RUNTIME_SAFETY_PASS";

const basePreview = {
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "fix/onboarding-survey-safe-ui",
  NEXT_PUBLIC_SUPABASE_URL: "https://xgelazzdgluuenqkymox.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: STAGING_ANON,
};

function runWithEnvironment(environment) {
  const originalEnvironment = { ...process.env };
  const messages = [];
  const originalInfo = console.info;
  try {
    for (const name of Object.keys(process.env)) delete process.env[name];
    Object.assign(process.env, environment);
    console.info = (...args) => messages.push(args.map(String).join(" "));
    let thrown;
    try {
      register();
    } catch (error) {
      thrown = error;
    }
    return { messages, thrown };
  } finally {
    console.info = originalInfo;
    for (const name of Object.keys(process.env)) delete process.env[name];
    Object.assign(process.env, originalEnvironment);
  }
}

function assertNoSensitiveValues(messages, environment) {
  const output = messages.join("\n");
  for (const value of Object.values(environment)) {
    if (value) assert.doesNotMatch(output, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(output, /password|token|secret|service_role|supabase\.co/i);
}

test("real register logs the fixed marker only after the isolated PR14 guard passes", () => {
  const result = runWithEnvironment(basePreview);
  assert.equal(result.thrown, undefined);
  assert.deepEqual(result.messages, [MARKER]);
  assertNoSensitiveValues(result.messages, basePreview);
});

test("real register blocks Production URL and never logs the marker", () => {
  const environment = { ...basePreview, NEXT_PUBLIC_SUPABASE_URL: "https://yzcvdspiiiaidsdripxr.supabase.co" };
  const result = runWithEnvironment(environment);
  assert.match(result.thrown?.message ?? "", /supabase_project_mismatch|invalid_preview_endpoint/);
  assert.equal(result.messages.includes(MARKER), false);
  assertNoSensitiveValues(result.messages, environment);
});

test("real register fails closed for absent and incomplete Vercel context", () => {
  for (const environment of [
    (() => { const value = { ...basePreview }; delete value.VERCEL_ENV; delete value.VERCEL_GIT_COMMIT_REF; return value; })(),
    (() => { const value = { ...basePreview }; delete value.VERCEL_GIT_COMMIT_REF; return value; })(),
  ]) {
    const result = runWithEnvironment(environment);
    assert.match(result.thrown?.message ?? "", /execution_context_required|preview_branch_missing/);
    assert.equal(result.messages.includes(MARKER), false);
    assertNoSensitiveValues(result.messages, environment);
  }
});

test("real register blocks active server integrations", () => {
  const environment = { ...basePreview, OPENAI_API_KEY: "synthetic-local-only" };
  const result = runWithEnvironment(environment);
  assert.match(result.thrown?.message ?? "", /preview_integration_must_be_disabled/);
  assert.equal(result.messages.includes(MARKER), false);
  assertNoSensitiveValues(result.messages, environment);
});

test("real register never emits the PR14 marker for Production or other Preview", () => {
  const scenarios = [
    { ...basePreview, VERCEL_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: "https://yzcvdspiiiaidsdripxr.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJub25lIn0.eyJyb2xlIjoiYW5vbiIsInJlZiI6Inl6Y3Zkc3BpaWlhaWRzZHJpcHhyIn0.sig" },
    { ...basePreview, VERCEL_GIT_COMMIT_REF: "codex/staging-block-b" },
  ];
  const production = runWithEnvironment(scenarios[0]);
  assert.equal(production.thrown, undefined);
  assert.equal(production.messages.includes(MARKER), false);
  const otherPreview = runWithEnvironment(scenarios[1]);
  assert.equal(otherPreview.thrown, undefined);
  assert.equal(otherPreview.messages.includes(MARKER), false);
});
