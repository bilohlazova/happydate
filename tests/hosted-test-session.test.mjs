import test from 'node:test';
import assert from 'node:assert/strict';
import {logHostedAiAttestation, reserveHostedTestSession, SESSION_RESERVE_LUA} from '../src/lib/assistant/hostedTestSession.server.ts';
import {withAiExecutionScope,runMeteredAiCall,runMeteredAiStream} from '../src/lib/assistant/aiExecution.server.ts';
import {parseAssistantChatRequest} from '../src/lib/assistant/chatContract.ts';
const env={SEC01_DENY_AI_EGRESS:undefined,HAPPYDATE_AI_TEST_SESSION_ID:'sec01-synthetic-session-123456',NODE_ENV:'production',VERCEL:'1',VERCEL_TARGET_ENV:'preview',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),UPSTASH_REDIS_REST_URL:'https://synthetic.invalid',UPSTASH_REDIS_REST_TOKEN:'synthetic-not-a-credential'};
const runtimeEnv={...env, SEC01_DENY_AI_EGRESS:'0'};
const saved={...process.env};
test.afterEach(()=>{for(const k of Object.keys(env)){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}});
test('disabled has no network; incomplete/production config fails closed',async()=>{
 await reserveHostedTestSession(100,700,{});
 await assert.rejects(reserveHostedTestSession(100,700,{NODE_ENV:'production',VERCEL:'1',VERCEL_TARGET_ENV:'preview',VERCEL_ENV:'preview'}),e=>e.status===503);
 for(const change of [{VERCEL_ENV:'production'},{HAPPYDATE_AI_TEST_SESSION_ID:''},{VERCEL_GIT_COMMIT_SHA:''},{UPSTASH_REDIS_REST_URL:'http://synthetic.invalid'}])await assert.rejects(reserveHostedTestSession(100,700,{...env,...change}),e=>e.status===503);
});
test('REST protocol and all denial/error/malformed results fail closed',async()=>{
 const old=globalThis.fetch;
 try {for(const result of [0,9,'1',null]){globalThis.fetch=async(url,init)=>{assert.equal(url.href,env.UPSTASH_REDIS_REST_URL+'/');assert.equal(init.headers.Authorization,'Bearer '+env.UPSTASH_REDIS_REST_TOKEN);const c=JSON.parse(init.body);assert.equal(c[0],'EVAL');assert.equal(c[1],SESSION_RESERVE_LUA);assert.equal(c[3],'sec01:session:'+env.HAPPYDATE_AI_TEST_SESSION_ID);return Response.json({result});};await assert.rejects(reserveHostedTestSession(100,700,env),e=>e.status===503);}
 globalThis.fetch=async()=>{throw Error('private-token-do-not-log');};await assert.rejects(reserveHostedTestSession(100,700,env),e=>e.status===503&&!e.message.includes('private'));
 globalThis.fetch=async()=>Response.json({result:1});await reserveHostedTestSession(100,700,env);
 }finally{globalThis.fetch=old;}
});
test('every feature, explicit retry and stream must cross hosted gate before provider',async()=>{
 Object.assign(process.env,runtimeEnv);let provider=0,attempts=0;const old=globalThis.fetch;
 const controls={limiter:{check:async()=>({allowed:true,resetAt:Date.now()+1000})},budget:{reserve:async()=>({allowed:true,reservation:{reservedCostUnits:1,settle:async()=>{}}})}};
 const scoped=fn=>withAiExecutionScope({kind:'authenticated',key:'synthetic'},fn,controls);
 try{globalThis.fetch=async()=>{attempts++;return Response.json({result:0});};
 for(const feature of ['happy-agent','learning','gifts','tasks','rescue','chat','gifts'])await assert.rejects(scoped(()=>runMeteredAiCall({feature,model:'gpt-4.1-mini',payload:{},maxOutputTokens:700,call:async()=>{provider++;return {};},usage:()=>null})),e=>e.status===503);
 await assert.rejects(scoped(()=>runMeteredAiStream({feature:'chat',model:'gpt-4.1-mini',payload:{},maxOutputTokens:700,call:async()=>{provider++;return (async function*(){})();},usage:()=>null})),e=>e.status===503);
 assert.equal(attempts,8);assert.equal(provider,0);
 }finally{globalThis.fetch=old;}
});
test('successful measured call records actual usage but never unlocks next call automatically',async()=>{
 Object.assign(process.env,runtimeEnv);const old=globalThis.fetch;const commands=[];
 const controls={limiter:{check:async()=>({allowed:true,resetAt:Date.now()+1000})},budget:{reserve:async()=>({allowed:true,reservation:{reservedCostUnits:1,settle:async()=>{}}})}};
 try{globalThis.fetch=async(url,init)=>{commands.push(JSON.parse(init.body));return Response.json({result:1});};
 await withAiExecutionScope({kind:'authenticated',key:'synthetic'},()=>runMeteredAiCall({feature:'happy-agent',model:'gpt-4.1-mini',payload:{},maxOutputTokens:700,call:async()=>({}),usage:()=>({inputTokens:10,outputTokens:2})}),controls);
 assert.equal(commands.length,2);assert.equal(commands[1][5],18);assert.equal(commands[1][6],'1');assert.ok(!commands.some(c=>c[1].includes("s.pending=false")));
 }finally{globalThis.fetch=old;}
});
test('provider error and streaming cancellation record ambiguous blocked outcome',async()=>{
 Object.assign(process.env,runtimeEnv);const old=globalThis.fetch;const commands=[];
 const controls={limiter:{check:async()=>({allowed:true,resetAt:Date.now()+1000})},budget:{reserve:async()=>({allowed:true,reservation:{reservedCostUnits:1,settle:async()=>{}}})}};
 const scoped=fn=>withAiExecutionScope({kind:'authenticated',key:'synthetic'},fn,controls);
 try{globalThis.fetch=async(url,init)=>{commands.push(JSON.parse(init.body));return Response.json({result:1});};
 await assert.rejects(scoped(()=>runMeteredAiCall({feature:'gifts',model:'gpt-4.1-mini',payload:{},maxOutputTokens:700,call:async()=>{throw Error('timeout');},usage:()=>null})));
 assert.equal(commands.at(-1)[5],-1);assert.equal(commands.at(-1)[6],'0');
 const stream=await scoped(()=>runMeteredAiStream({feature:'chat',model:'gpt-4.1-mini',payload:{},maxOutputTokens:700,call:async()=> (async function*(){yield {};yield {};})(),usage:()=>null}));
 for await(const unused of stream){void unused;break;}
 assert.equal(commands.at(-1)[5],-1);assert.equal(commands.at(-1)[6],'0');
 }finally{globalThis.fetch=old;}
});

test('call and streaming deny before provider when hosted identity or Redis state is invalid', async () => {
 const invalid = [
  ['missing id', {...env, HAPPYDATE_AI_TEST_SESSION_ID: undefined}, null],
  ['unknown production deployment', {NODE_ENV:'production'}, null],
  ['malformed id', {...env, HAPPYDATE_AI_TEST_SESSION_ID:'bad'}, null],
  ['production with id', {...env, VERCEL_ENV:'production', VERCEL_TARGET_ENV:'production'}, null],
  ['target mismatch', {...env, VERCEL_TARGET_ENV:'production'}, null],
  ['production label alone', {NODE_ENV:'production', VERCEL_ENV:'production'}, null],
  ['missing SHA', {...env, VERCEL_GIT_COMMIT_SHA:undefined}, null],
  ['malformed SHA', {...env, VERCEL_GIT_COMMIT_SHA:'bad'}, null],
  ['missing Redis credentials', {...env, UPSTASH_REDIS_REST_TOKEN:undefined}, null],
  ['Redis unavailable', env, 'error'],
  ['session missing or bound to a different SHA', env, 'denial'],
 ];
 const originalFetch = globalThis.fetch;
 try {
  for (const [label, config, redis] of invalid) {
   for (const run of [runMeteredAiCall, runMeteredAiStream]) {
    for (const key of Object.keys(env)) {
     if (key === "SEC01_DENY_AI_EGRESS") process.env[key] = "1";
     else if (config[key] === undefined) delete process.env[key];
     else process.env[key] = config[key];
    }
    let calls = 0, metering = 0, redisCalls = 0;
    globalThis.fetch = async (_url, init) => {
     redisCalls++;
     assert.equal(JSON.parse(init.body)[1], SESSION_RESERVE_LUA);
     if (redis === 'error') throw Error('offline');
     return Response.json({result:0});
    };
    const controls = {
     limiter:{check:async()=>{metering++;return {allowed:true};}},
     budget:{reserve:async()=>{metering++;return {allowed:true,reservation:{}};}},
    };
    await assert.rejects(withAiExecutionScope({kind:'guest',key:'synthetic'}, () => run({
     feature:'chat', model:'gpt-4.1-mini', payload:{}, maxOutputTokens:700,
     call:async()=>{calls++;}, usage:()=>null,
    }), controls), e => e.status===503 && e.code==='service_unavailable', label);
    assert.equal(calls,0,label);
    assert.equal(redisCalls,redis ? 1 : 0,label);
    if (!redis) assert.equal(metering,0,label);
   }
  }
 } finally {globalThis.fetch=originalFetch;}
});

test('consistent Vercel Production identity keeps existing metering without test session', async () => {
 assert.equal(await reserveHostedTestSession(100,700,{
  NODE_ENV:'production',VERCEL:'1',VERCEL_ENV:'production',VERCEL_TARGET_ENV:'production',VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),
 }), null);
});

test('egress deny runs after Redis session authorization and blocks both provider callbacks', async () => {
 Object.assign(process.env, runtimeEnv, {SEC01_DENY_AI_EGRESS:'1'});
 const originalFetch = globalThis.fetch;
 const originalWarn = console.warn;
 const controls = {
  limiter:{check:async()=>({allowed:true})},
  budget:{reserve:async()=>({allowed:true,reservation:{}})},
 };
 try {
  for (const run of [runMeteredAiCall, runMeteredAiStream]) {
   for (const attempt of [0, 1]) {
    let calls = 0;
    const commands = [];
    const warnings = [];
    console.warn = message => warnings.push(JSON.parse(message));
    globalThis.fetch = async (_url, init) => {
     commands.push(JSON.parse(init.body));
     return Response.json({result:attempt});
    };
    await assert.rejects(withAiExecutionScope({kind:'guest',key:'synthetic'}, () => run({
     feature:'chat', model:'gpt-4.1-mini', payload:{}, maxOutputTokens:700,
     call:async()=>{calls++;}, usage:()=>null,
    }), controls), e => e.status===503 && e.code==='service_unavailable');
    assert.equal(calls,0);
    assert.equal(commands[0][1],SESSION_RESERVE_LUA);
    assert.equal(commands.length,attempt === 0 ? 1 : 2);
    assert.deepEqual(warnings.map(entry=>entry.event),attempt === 0 ? ['redis-session-denied-with-egress-disabled'] : []);
   }
  }
 } finally {
  globalThis.fetch=originalFetch;
  console.warn=originalWarn;
 }
});

test('only an invalid attestation envelope logs Preview runtime booleans', () => {
 const entries = [];
 const info = console.info;
 console.info = message => {
  const {event, ...checks} = JSON.parse(message);
  entries.push([event, checks]);
 };
 try {
  const body = {sec01AttestDeploymentSha:env.VERCEL_GIT_COMMIT_SHA};
  assert.equal(parseAssistantChatRequest(body).success,false);
  logHostedAiAttestation(body,{...env,SEC01_DENY_AI_EGRESS:'1'});
  logHostedAiAttestation(body,{...env,VERCEL_ENV:'production',VERCEL_TARGET_ENV:'production'});
  logHostedAiAttestation(body,{...env,VERCEL_TARGET_ENV:undefined});
  logHostedAiAttestation({...body,message:'private text'},env);
  logHostedAiAttestation(body,{...env,VERCEL_GIT_COMMIT_SHA:'b'.repeat(40),HAPPYDATE_AI_TEST_SESSION_ID:'bad',UPSTASH_REDIS_REST_TOKEN:undefined});
  assert.deepEqual(entries,[
   ['sec01-hosted-ai-attestation',{egressDenied:true,preview:true,shaMatches:true,sessionIdValid:true,redisConfigured:true}],
   ['sec01-hosted-ai-attestation',{egressDenied:false,preview:true,shaMatches:false,sessionIdValid:false,redisConfigured:false}],
  ]);
 } finally {console.info=info;}
});
