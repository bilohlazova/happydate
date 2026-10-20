import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const run = promisify(execFile);

test("weekly Assistant baseline is synthetic, bounded and explicitly secret-gated", async () => {
  const workflow = await read(".github/workflows/assistant-live-evaluation.yml");
  assert.match(workflow, /schedule:\s*\n\s*- cron: "17 5 \* \* 1"/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /timeout-minutes: 15/);
  assert.match(workflow, /OPENAI_API_KEY: \$\{\{ secrets\.HAPPYDATE_ASSISTANT_EVAL_OPENAI_API_KEY \}\}/);
  assert.match(workflow, /Use Node\.js 24/);
  assert.match(workflow, /npm run eval:assistant\s/);
  assert.match(workflow, /Synthetic dataset validation: PASS/);
  assert.match(workflow, /Real OpenAI evaluation: SKIPPED/);
  assert.match(workflow, /npm run eval:assistant:live \| tee assistant-live-evaluation\.txt/);
  const liveStep = workflow.match(/- name: Run real OpenAI evaluation \(paid\)[\s\S]*?(?=\n      - name: Record real OpenAI evaluation PASS)/)?.[0] ?? "";
  assert.match(liveStep, /shell: bash/);
  assert.match(liveStep, /set -o pipefail/);
  assert.match(workflow, /Real OpenAI evaluation: PASS/);
  assert.match(workflow, /retention-days: 30/);
  assert.doesNotMatch(workflow, /NEXT_PUBLIC_|SUPABASE|production|user[_ -]?data/i);
});

test("live evaluation pipeline cannot mask a failing npm command", async () => {
  const workflow = await read(".github/workflows/assistant-live-evaluation.yml");
  const liveStep = workflow.match(/- name: Run real OpenAI evaluation \(paid\)[\s\S]*?(?=\n      - name: Record real OpenAI evaluation PASS)/)?.[0] ?? "";
  assert.match(liveStep, /set -o pipefail/);
  assert.doesNotMatch(liveStep, /set \+o pipefail/);

  await run("bash", ["-c", "false | tee >/dev/null"]);
  await assert.rejects(run("bash", ["-euo", "pipefail", "-c", "false | tee >/dev/null"]));
});

test("live evaluator never prints generated response content", async () => {
  const evaluator = await read("scripts/evaluate-assistant.mjs");
  assert.match(evaluator, /failures\.map\(\(\{ code \}\) => code\)/);
  assert.doesNotMatch(evaluator, /process\.stdout\.write\([^\n]*response/);
  assert.doesNotMatch(evaluator, /console\.log\(response\)/);
});
