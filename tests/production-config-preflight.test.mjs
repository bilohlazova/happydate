import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const run = promisify(execFile);
const script = "scripts/preflight-production-config.mjs";
const baseEnv = { PATH: process.env.PATH, NODE_ENV: "production" };

test("production preflight fails safely and does not print secret values", async () => {
  await assert.rejects(
    run(process.execPath, ["--experimental-strip-types", script], { env: baseEnv }),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Production AI configuration preflight: FAIL/);
      assert.match(error.stderr, /openai_key_missing/);
      assert.doesNotMatch(error.stderr, /OPENAI_API_KEY=/);
      return true;
    },
  );
});

test("production preflight passes with the complete contract without probing providers", async () => {
  const secretValues = {
    OPENAI_API_KEY: "synthetic-openai-key",
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "synthetic-upstash-token",
    OPENAI_DAILY_BUDGET_USD: "2",
  };
  const { stdout, stderr } = await run(process.execPath, ["--experimental-strip-types", script], {
    env: { ...baseEnv, ...secretValues },
  });

  assert.match(stdout, /Production AI configuration preflight: PASS/);
  assert.match(stdout, /does not call OpenAI or Redis/);
  assert.equal(stderr, "");
  for (const value of Object.values(secretValues)) assert.doesNotMatch(stdout, new RegExp(value));
});
