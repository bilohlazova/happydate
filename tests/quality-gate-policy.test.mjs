import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const workflow=readFileSync(new URL('../.github/workflows/quality.yml',import.meta.url),'utf8');
const marker="          node - <<'JS'\n";
const body=workflow.split(marker)[1]?.split('\n          JS')[0].split('\n').map(l=>l.slice(10)).join('\n');
const names=['dependency-security','web-quality','database-security','redis-session-security','android-debug','ios-simulator'];
const passed=()=>Object.fromEntries(names.map(n=>[n,{result:'success'}]));
const check=jobs=>spawnSync(process.execPath,['-'],{input:body,env:{RESULTS:JSON.stringify(jobs)},encoding:'utf8'});
test('release aggregate requires success from every security and diagnostic job',()=>{
 assert.ok(body);assert.equal(check(passed()).status,0);
 for(const name of names)for(const result of ['failure','cancelled','skipped']){const jobs=passed();jobs[name]={result};assert.equal(check(jobs).status,1,`${name}/${result}`);}
 const missing=passed();delete missing['dependency-security'];assert.equal(check(missing).status,1);
 assert.equal(check({}).status,1);
});
test('security audit and native diagnostics are independent without lowering audit threshold',()=>{
 assert.match(workflow,/npm audit --audit-level=low --json/);assert.match(workflow,/npm audit --omit=dev --audit-level=low --json/);
 assert.doesNotMatch(workflow,/continue-on-error|needs: web-quality/);
 assert.match(workflow,/release-quality-gate:[\s\S]*name: Verify, build and runtime smoke[\s\S]*if: always\(\)/);
});
