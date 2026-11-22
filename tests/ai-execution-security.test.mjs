import assert from 'node:assert/strict';
import test from 'node:test';
import { withAiExecutionScope, runMeteredAiCall, runMeteredAiStream, parseOpenAiUsage, estimateAiPayloadTokens } from '../src/lib/assistant/aiExecution.server.ts';
import { MemoryAiBudget } from '../src/lib/assistant/aiBudget.ts';
const identity = {kind:'authenticated',key:'synthetic-owner'};
const allowed = {check:async()=>({allowed:true,remaining:10,resetAt:Date.now()+1000})};
function fixture(overrides={}) {
  let calls=0;const reservations=[],settlements=[];
  const controls={limiter:allowed,budget:{reserve:async(input,max)=>{reservations.push({input,max});return {allowed:true,reservation:{reservedCostUnits:input+4*max,settle:async usage=>{settlements.push(usage);}}};}},...overrides};
  const request={feature:'happy-agent',model:'gpt-4.1-mini',payload:{instructions:'synthetic',schema:{required:['id']},input:'synthetic'},maxOutputTokens:700,call:async()=>{calls++;return {usage:{input_tokens:321,output_tokens:45,total_tokens:366}};},usage:r=>parseOpenAiUsage(r.usage,'responses')};
  return {controls,request,reservations,settlements,get calls(){return calls;},run:()=>withAiExecutionScope(identity,()=>runMeteredAiCall(request),controls)};
}
test('no server identity, guest private feature and unknown model are denied before SDK',async()=>{
 const f=fixture();await assert.rejects(()=>runMeteredAiCall(f.request),e=>e.status===401);
 await assert.rejects(()=>withAiExecutionScope({kind:'guest',key:'guest'},()=>runMeteredAiCall(f.request),f.controls),e=>e.status===401);
 f.request.model='unpriced-model';await assert.rejects(f.run,e=>e.status===503);assert.equal(f.calls,0);assert.equal(f.reservations.length,0);
});
test('complete SDK payload reserved exactly once; both input/output usage settled once',async()=>{
 const f=fixture();await f.run();assert.equal(f.calls,1);assert.equal(f.reservations.length,1);assert.ok(f.reservations[0].input>=Buffer.byteLength(JSON.stringify(f.request.payload)));assert.deepEqual(f.settlements,[{inputTokens:321,outputTokens:45}]);
});
test('exhausted or unavailable budget, denied limiter and Redis failure never invoke SDK',async()=>{
 for(const controls of [{budget:null},{limiter:null},{budget:{reserve:async()=>({allowed:false,retryAfterSeconds:30})}},{limiter:{check:async()=>({allowed:false,resetAt:Date.now()+1000})}},{limiter:{check:async()=>{throw Error('synthetic Redis unavailable');}}}]){const f=fixture(controls);await assert.rejects(f.run,e=>[429,503].includes(e.status));assert.equal(f.calls,0);assert.equal(f.settlements.length,0);}
});
test('timeout/ambiguous provider failure retains reservation and releases lease',async()=>{
 let released=0;const f=fixture({limiter:{...allowed,acquire:async()=>async()=>{released++;}}});f.request.call=async()=>{throw Object.assign(Error('private provider body'),{name:'AbortError'});};await assert.rejects(f.run,e=>e.code==='provider_unavailable'&&!e.message.includes('private'));assert.equal(f.reservations.length,1);assert.equal(f.settlements.length,0);assert.equal(released,1);
});
test('missing, malformed, fractional or partial usage never refunds an assumed zero',async()=>{
 for(const usage of [undefined,{}, {input_tokens:3}, {input_tokens:-1,output_tokens:1}, {input_tokens:1.5,output_tokens:1}, {input_tokens:NaN,output_tokens:1}, {input_tokens:1,output_tokens:2,total_tokens:0}]){const f=fixture();f.request.call=async()=>({usage});await f.run();assert.equal(f.settlements.length,0);}
 assert.deepEqual(parseOpenAiUsage({prompt_tokens:11,completion_tokens:7,total_tokens:18},'chat'),{inputTokens:11,outputTokens:7});assert.equal(parseOpenAiUsage({prompt_tokens:11,completion_tokens:7},'responses'),null);
});
test('parallel calls cannot exceed reserved budget; missing usage retains worst case',async()=>{
 let calls=0;const controls={budget:new MemoryAiBudget(0.1),limiter:allowed};const request={feature:'rescue',model:'gpt-4.1-mini',payload:{input:'x'.repeat(50000)},maxOutputTokens:10000,call:async()=>{calls++;return {};},usage:()=>null};
 const result=await Promise.allSettled(Array.from({length:6},()=>withAiExecutionScope(identity,()=>runMeteredAiCall(request),controls)));
 assert.equal(calls,2);assert.equal(result.filter(x=>x.status==='rejected'&&x.reason.code==='daily_ai_budget_exceeded').length,4);
});
test('explicit retry has a new reservation; no automatic SDK callback retry',async()=>{
 const f=fixture();f.request.call=async()=>{throw Error('synthetic');};await assert.rejects(f.run);await assert.rejects(f.run);assert.equal(f.reservations.length,2);assert.equal(f.settlements.length,0);
});
test('stream meters final usage; cancellation/stream failure keeps reserve and releases',async()=>{
 for(const fail of [false,true]){let released=0,settled=0;const controls={limiter:{...allowed,acquire:async()=>async()=>{released++;}},budget:{reserve:async()=>({allowed:true,reservation:{reservedCostUnits:100,settle:async()=>{settled++;}}})}};
 const stream=await withAiExecutionScope(identity,()=>runMeteredAiStream({feature:'chat',model:'gpt-4.1-mini',payload:{messages:[]},maxOutputTokens:700,call:async()=> (async function*(){yield {text:'synthetic'};if(fail)throw Error('synthetic stream error');yield {usage:{prompt_tokens:4,completion_tokens:2}};})(),usage:c=>parseOpenAiUsage(c.usage,'chat')}),controls);
 try{for await(const unused of stream)void unused;}catch{assert.equal(fail,true);}assert.equal(released,1);assert.equal(settled,fail?0:1);
 }
});
test('late memory settlement cannot refund a new UTC day; malformed settlement retains funds',async()=>{
 let now=new Date('2026-11-15T23:59:59Z');const b=new MemoryAiBudget(.1,()=>now);const first=await b.reserve(200000,1000);assert.equal(first.allowed,true);now=new Date('2026-11-16T00:00:01Z');assert.equal((await b.reserve(200000,1000)).allowed,true);await first.reservation.settle({inputTokens:0,outputTokens:0});assert.equal((await b.reserve(100000,1000)).allowed,false);
 await assert.rejects(()=>first.reservation.settle({inputTokens:NaN,outputTokens:0}));assert.ok(estimateAiPayloadTokens({tools:[{schema:'x'.repeat(10000)}]})>10000);
});
test('consumer cancellation retains the whole stream reservation and releases its lease',async()=>{
 let releases=0,settlements=0;
 const controls={limiter:{...allowed,acquire:async()=>async()=>{releases++;}},budget:{reserve:async()=>({allowed:true,reservation:{reservedCostUnits:100,settle:async()=>{settlements++;}}})}};
 const stream=await withAiExecutionScope(identity,()=>runMeteredAiStream({feature:'chat',model:'gpt-4.1-mini',payload:{messages:[]},maxOutputTokens:700,call:async()=> (async function*(){yield {text:'synthetic'};yield {usage:{prompt_tokens:4,completion_tokens:2}};})(),usage:c=>parseOpenAiUsage(c.usage,'chat')}),controls);
 for await(const chunk of stream){assert.equal(chunk.text,'synthetic');break;}
 assert.equal(releases,1);assert.equal(settlements,0);
});
