import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import test from 'node:test';
import {UpstashAiBudget} from '../src/lib/assistant/aiBudget.ts';
const exec=promisify(execFile);
const enabled=process.env.RUN_LOCAL_REDIS_BUDGET_TESTS==='1';
test('real isolated Redis serializes concurrent reservations and never double-refunds or revives expired keys',{skip:!enabled},async()=>{
 const container=process.env.LOCAL_REDIS_CONTAINER;
 assert.match(container??'',/^happydate-sec01-redis-[a-z0-9-]+$/);
 const command=async args=>{const {stdout}=await exec('docker',['exec',container,'redis-cli','--json',...args.map(String)]);return JSON.parse(stdout);};
 const previous=globalThis.fetch;
 globalThis.fetch=async(url,init)=>{assert.equal(String(url),'https://local-redis.invalid');return Response.json({result:await command(JSON.parse(init.body))});};
 try{
  const day='2026-11-15',key=`ai:daily-cost:${day}`;
  const budget=new UpstashAiBudget('https://local-redis.invalid','synthetic',.1,()=>new Date(day+'T12:00:00Z'));
  const results=await Promise.all(Array.from({length:10},()=>budget.reserve(100000,1000)));
  assert.equal(results.filter(x=>x.allowed).length,2);
  assert.equal(Number(await command(['GET',key])),208000);
  const first=results.find(x=>x.allowed).reservation;
  await Promise.all([first.settle({inputTokens:10000,outputTokens:1000}),first.settle({inputTokens:10000,outputTokens:1000})]);
  assert.equal(Number(await command(['GET',key])),118000);
  const second=results.filter(x=>x.allowed)[1].reservation;
  await assert.rejects(()=>second.settle({inputTokens:NaN,outputTokens:1}));
  assert.equal(Number(await command(['GET',key])),118000);
  await command(['DEL',key]);
  await second.settle({inputTokens:1,outputTokens:1});
  assert.equal(await command(['EXISTS',key]),0);
 }finally{globalThis.fetch=previous;}
});
