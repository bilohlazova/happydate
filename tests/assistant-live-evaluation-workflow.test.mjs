import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("weekly Assistant baseline is synthetic, bounded and explicitly secret-gated", async () => {
  const workflow = await read(".github/workflows/assistant-live-evaluation.yml");
  assert.match(workflow, /schedule:\s*\n\s*- cron: "17 5 \* \* 1"/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /timeout-minutes: 15/);
  assert.match(workflow, /OPENAI_API_KEY: \$\{\{ secrets\.HAPPYDATE_ASSISTANT_EVAL_OPENAI_API_KEY \}\}/);
  assert.match(workflow, /npm run eval:assistant\s/);
  assert.match(workflow, /npm run eval:assistant:live \| tee assistant-live-evaluation\.txt/);
  assert.match(workflow, /retention-days: 30/);
  assert.doesNotMatch(workflow, /NEXT_PUBLIC_|SUPABASE|production|user[_ -]?data/i);
});

test("live evaluator never prints generated response content", async () => {
  const evaluator = await read("scripts/evaluate-assistant.mjs");
  assert.match(evaluator, /failures\.map\(\(\{ code \}\) => code\)/);
  assert.doesNotMatch(evaluator, /process\.stdout\.write\([^\n]*response/);
  assert.doesNotMatch(evaluator, /console\.log\(response\)/);
});
