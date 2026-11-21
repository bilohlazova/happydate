// Mandatory CI integration: real isolated Redis Lua + synthetic REST bridge, not Upstash proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {reserveHostedTestSession,SESSION_FINISH_LUA,SESSION_ACK_LUA} from '../src/lib/assistant/hostedTestSession.server.ts';
import {UpstashAiBudget} from '../src/lib/assistant/aiBudget.ts';
const exec=promisify(execFile);
test('real Redis hosted session lifecycle (no skipped fallback)',async t=>{
 const container=process.env.LOCAL_REDIS_CONTAINER;
 assert.ok(/^happydate-sec01-redis-[a-z0-9-]+$/.test(container??'') || (process.env.GITHUB_ACTIONS==='true' && /^[a-f0-9]{64}$/.test(container??'')), 'isolated Redis container is required');
 const cmd=async args=>JSON.parse((await exec('docker',['exec',container,'redis-cli','--json',...args.map(String)])).stdout);
 const env={HAPPYDATE_AI_TEST_SESSION_ID:'sec01-ci-integration-12345678',NODE_ENV:'production',VERCEL:'1',VERCEL_TARGET_ENV:'preview',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),UPSTASH_REDIS_REST_URL:'https://isolated-ci.invalid',UPSTASH_REDIS_REST_TOKEN:'synthetic-contract-token'};
 const key='sec01:session:'+env.HAPPYDATE_AI_TEST_SESSION_ID;
 const seed=async overrides=>cmd(['SET',key,JSON.stringify({version:1,sha:env.VERCEL_GIT_COMMIT_SHA,deadline:Date.now()+60000,status:'active',calls:0,units:0,pending:false,...overrides}),'PX',60000]);
 const state=async()=>JSON.parse(await cmd(['GET',key]));
 const ack=async()=>{const s=await state();return cmd(['EVAL',SESSION_ACK_LUA,1,key,env.VERCEL_GIT_COMMIT_SHA,s.pending,s.calls]);};
 const oldFetch=globalThis.fetch;
 let failConnection=false,settlementTimeout=false,dailyTimeout=false;
 globalThis.fetch=async(url,init)=>{
  assert.equal(new URL(url).href,'https://isolated-ci.invalid/');assert.equal(init.headers.Authorization,'Bearer '+env.UPSTASH_REDIS_REST_TOKEN);
  if(failConnection)throw Error('synthetic connection failure');
  const command=JSON.parse(init.body);
  if(dailyTimeout && command[3]==='ai:daily-cost:2026-11-17' && String(command[1]).includes('KEEPTTL'))throw Error('synthetic daily settlement timeout');
  if(settlementTimeout && command[1]===SESSION_FINISH_LUA)throw Error('synthetic settlement timeout');
  return Response.json({result:await cmd(command)});
 };
 try{
  await t.test('20 concurrent clients share exactly one pending permit',async()=>{
   await seed();const r=await Promise.allSettled(Array.from({length:20},()=>reserveHostedTestSession(100,700,{...env})));
   assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal((await state()).calls,1);assert.ok(await cmd(['PTTL',key])>0);
  });
  await t.test('actual usage, retained reserve, duplicate finish, reconciliation, ninth denial',async()=>{
   await seed();for(let n=1;n<=8;n++){
    const p=await reserveHostedTestSession(100,700,{...env});await p.finish({inputTokens:10,outputTokens:2},true);await p.finish({inputTokens:1,outputTokens:0},true);
    const s=await state();assert.equal(s.actual,18);assert.equal(s.units,2900*n);assert.equal(s.calls,n);assert.equal(s.outcome,'measured');assert.equal(await ack(),1);
   }
   assert.equal((await state()).status,'closed');await assert.rejects(reserveHostedTestSession(100,700,env),e=>e.status===503);
  });
  await t.test('budget exhaustion and mismatched SHA reject without changing count',async()=>{
   await seed({units:249999});await assert.rejects(reserveHostedTestSession(100,700,env));assert.equal((await state()).calls,0);
   await seed({sha:'b'.repeat(40)});await assert.rejects(reserveHostedTestSession(100,700,env));assert.equal((await state()).calls,0);
  });
  await t.test('real daily Lua settlement refunds once; timeout retains conservative reserve',async()=>{
   const daily='ai:daily-cost:2026-11-17';await cmd(['DEL',daily]);
   const b=new UpstashAiBudget(env.UPSTASH_REDIS_REST_URL,env.UPSTASH_REDIS_REST_TOKEN,.1,()=>new Date('2026-11-17T12:00:00Z'));
   try{const r=await b.reserve(100000,1000);assert.equal(r.allowed,true);assert.equal(Number(await cmd(['GET',daily])),104000);
    await r.reservation.settle({inputTokens:100,outputTokens:2});await r.reservation.settle({inputTokens:1,outputTokens:0});assert.equal(Number(await cmd(['GET',daily])),108);assert.ok(await cmd(['TTL',daily])>0);
    const next=await b.reserve(100000,1000);dailyTimeout=true;await assert.rejects(next.reservation.settle({inputTokens:100,outputTokens:2}));dailyTimeout=false;assert.equal(Number(await cmd(['GET',daily])),104108);
   }finally{dailyTimeout=false;await cmd(['DEL',daily]);}
  });
  await t.test('daily settlement timeout, missing usage, provider timeout/cancel retain blocked state',async()=>{
   for(const [usage,settled] of [[{inputTokens:10,outputTokens:2},false],[null,false]]){
    await seed();const p=await reserveHostedTestSession(100,700,env);await p.finish(usage,settled);assert.equal((await state()).status,'blocked');assert.equal(await ack(),0);await assert.rejects(reserveHostedTestSession(100,700,env));
   }
  });
  await t.test('session finish network timeout and process crash cannot unlock pending request',async()=>{
   await seed();const p=await reserveHostedTestSession(100,700,env);settlementTimeout=true;await assert.rejects(p.finish({inputTokens:10,outputTokens:2},true));settlementTimeout=false;
   assert.equal((await state()).outcome,'awaiting');assert.equal(await ack(),0);await assert.rejects(reserveHostedTestSession(100,700,{...env}));
  });
  await t.test('connection failure and malformed state fail closed',async()=>{
   await seed();failConnection=true;await assert.rejects(reserveHostedTestSession(100,700,env));failConnection=false;assert.equal((await state()).calls,0);
   await seed({calls:-1});await assert.rejects(reserveHostedTestSession(100,700,env));
  });
  await t.test('expired deadline / TTL / completed session never self-initialize',async()=>{
   await seed({deadline:1});await assert.rejects(reserveHostedTestSession(100,700,env));
   await cmd(['PEXPIRE',key,1]);await new Promise(r=>setTimeout(r,20));await assert.rejects(reserveHostedTestSession(100,700,env));assert.equal(await cmd(['EXISTS',key]),0);
   await seed({status:'closed'});await assert.rejects(reserveHostedTestSession(100,700,env));
  });
  await t.test('retry/next instance uses same counter independent of JS UTC date',async()=>{
   await seed();const DateBefore=globalThis.Date;
   try{for(const day of ['2026-11-17T23:59:59Z','2026-11-18T00:00:01Z']){
    globalThis.Date=class extends DateBefore{static now(){return DateBefore.parse(day);}};
    const p=await reserveHostedTestSession(100,700,{...env});await p.finish({inputTokens:10,outputTokens:2},true);assert.equal(await ack(),1);
   }}finally{globalThis.Date=DateBefore;}
   assert.equal((await state()).calls,2);assert.equal((await state()).units,5800);
  });
 }finally{globalThis.fetch=oldFetch;await cmd(['DEL',key]);assert.equal(await cmd(['EXISTS',key]),0);}
});
