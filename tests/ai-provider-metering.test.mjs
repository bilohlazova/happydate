import assert from 'node:assert/strict';
import test from 'node:test';
import './server-test-loader.mjs';
import {withAiExecutionScope} from '../src/lib/assistant/aiExecution.server.ts';
const {createOpenAiHappyAgentProvider}=await import('../src/lib/happy/agent/happyAgentProvider.server.ts');
const {createOpenAiOccasionRescueProvider}=await import('../src/lib/occasions/occasionRescueProvider.server.ts');
const {createOpenAiHappyLearningProvider}=await import('../src/lib/happy-learning/openAiHappyLearningProvider.server.ts');
const providers=[
 ['agent',()=>createOpenAiHappyAgentProvider('synthetic')({intent:'write_greeting',context:{user:{locale:'en',timezone:'UTC'}}})],
 ['rescue',()=>createOpenAiOccasionRescueProvider('synthetic')({locale:'en',person:{id:'synthetic',name:'Anna'},missing:['gift']})],
 ['learning',()=>createOpenAiHappyLearningProvider({apiKey:'synthetic'})({locale:'en',resolvedPersonName:'Anna',userMessage:'Anna likes ceramics.',allowedCaptureTypes:['interest'],allowedSemanticTags:['interest'],maxCandidates:1})],
];
for(const[name,run]of providers){
 test(`${name} actual SDK denies unavailable/exhausted budget and disables hidden retries`,async()=>{
  const previous=globalThis.fetch;let httpCalls=0,settlements=0;const reservations=[];
  globalThis.fetch=async()=>{httpCalls++;return Response.json({error:{message:'synthetic error',type:'server_error'}},{status:503});};
  const scope={kind:'authenticated',key:'synthetic-owner'};const limiter={check:async()=>({allowed:true,remaining:1,resetAt:Date.now()+1000})};
  try{
   await assert.rejects(()=>withAiExecutionScope(scope,run,{limiter,budget:null}),e=>e.status===503);assert.equal(httpCalls,0);
   await assert.rejects(()=>withAiExecutionScope(scope,run,{limiter,budget:{reserve:async()=>({allowed:false,retryAfterSeconds:1})}}),e=>e.status===429);assert.equal(httpCalls,0);
   await assert.rejects(()=>withAiExecutionScope(scope,run,{limiter,budget:{reserve:async(input,max)=>{reservations.push({input,max});return {allowed:true,reservation:{reservedCostUnits:1,settle:async()=>{settlements++;}}};}}}),e=>e.code==='provider_unavailable');
   assert.equal(httpCalls,1);assert.equal(reservations.length,1);assert.equal(settlements,0);
  }finally{globalThis.fetch=previous;}
 });
}
