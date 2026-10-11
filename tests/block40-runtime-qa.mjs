import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url&&anon&&service,"local Supabase environment required");
const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
const {createBirthdayTaskContinuationHandler}=await import("../src/lib/happy/task-engine/continueBirthdayTaskApplication.server.ts");

const users=[];
async function user(label){const email=`block40-${label}-${randomUUID()}@example.test`;const password=`Block40-${randomUUID()}!`;const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(error);users.push(data.user.id);const publicClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});const signed=await publicClient.auth.signInWithPassword({email,password});assert.ifError(signed.error);return {id:data.user.id,token:signed.data.session.access_token,client:publicClient};}
async function target(account,label){const person=randomUUID(),event=randomUUID();assert.ifError((await account.client.from("people").insert({id:person,user_id:account.id,name:`QA ${label}`})).error);assert.ifError((await account.client.from("events").insert({id:event,user_id:account.id,person_id:person,person_name:`QA ${label}`,title:`Birthday ${label}`,date:"2026-10-20",category:"birthday"})).error);return {person,event};}
async function task(owner,t){const {data,error}=await admin.rpc("create_birthday_preparation_task_v1",{p_user_id:owner,p_person_id:t.person,p_event_id:t.event});assert.ifError(error);return data[0].task_id;}
async function state(id){const taskResult=await admin.from("happy_tasks").select("id,status").eq("id",id).single();assert.ifError(taskResult.error);const stepsResult=await admin.from("happy_task_steps").select("position,type,status").eq("task_id",id).order("position");assert.ifError(stepsResult.error);return {task:taskResult.data,steps:stepsResult.data};}
async function counts(owner){const out={};for(const table of ["gifts","happy_actions","memories","happy_task_decisions","people","events"]){const {count,error}=await admin.from(table).select("id",{count:"exact",head:true}).eq("user_id",owner);assert.ifError(error);out[table]=count;}return out;}
const request=(token)=>new Request("http://local/api/happy/tasks/x/continue",{method:"POST",headers:token?{Authorization:`Bearer ${token}`}:{}});
const invoke=(handler,token,id)=>handler(request(token),{params:Promise.resolve({id})});
const response=async promise=>{const r=await promise;return {status:r.status,body:await r.json()};};
const canonical=(counter,captured,gate=null)=>async input=>{counter.count++;captured.push(input);if(gate){gate.started();await gate.wait;}const item=input.context.knowledge?.likes?.[0]??input.context.knowledge?.importantFacts?.[0];return item?{message:"One grounded option",idea:{title:"QA gift",message:"Grounded recommendation",reasonSources:[{type:"knowledge",id:item.id}]}}:{message:"No preference needed"};};

const A=await user("a"),B=await user("b");
try{
 const ta=await target(A,"A"),tb=await target(A,"A2");
 assert.ifError((await A.client.from("memories").insert({user_id:A.id,person_id:ta.person,type:"preference",value_text:"Ceramics",ai_tags:["like"],source:"manual",is_active:true})).error);
 const taskA=await task(A.id,ta),otherTask=await task(A.id,tb);
 assert.ifError((await admin.from("happy_task_decisions").insert([{user_id:A.id,task_id:taskA,kind:"avoid_gift_theme",display_value:"SPA",normalized_value:"spa",status:"active"},{user_id:A.id,task_id:otherTask,kind:"avoid_gift_theme",display_value:"Perfume",normalized_value:"perfume",status:"active"}])).error);
 const before=await counts(A.id),counter={count:0},captured=[];
 const handler=createBirthdayTaskContinuationHandler({provider:()=>canonical(counter,captured)});
 const standard=await response(invoke(handler,A.token,taskA));assert.equal(standard.status,200);assert.equal(standard.body.kind,"generated");assert.equal(counter.count,1);
 assert.deepEqual(captured[0].context.taskDecisions,{avoidGiftThemes:["SPA"]});assert.doesNotMatch(JSON.stringify(captured[0]),/Perfume|normalized_value|created_at/);
 const standardState=await state(taskA);assert.equal(standardState.task.status,"waiting_user");assert.deepEqual(standardState.steps.map(x=>x.status),["completed","completed","completed","waiting_user","pending","pending"]);assert.deepEqual(await counts(A.id),before);
 const resumed=await response(invoke(handler,A.token,taskA));assert.equal(resumed.body.kind,"waiting_user");assert.equal(counter.count,1);

 const foreign=await response(invoke(handler,B.token,taskA));const missing=await response(invoke(handler,A.token,randomUUID()));const unauth=await response(invoke(handler,null,taskA));assert.deepEqual([foreign.status,missing.status,unauth.status],[404,404,401]);assert.equal(counter.count,1);

 const tc=await target(A,"Concurrent"),taskC=await task(A.id,tc);let release;let signal;const started=new Promise(r=>signal=r);const wait=new Promise(r=>release=r);const concurrentCounter={count:0};const concurrentHandler=createBirthdayTaskContinuationHandler({provider:()=>canonical(concurrentCounter,[],{started:signal,wait})});const callerA=response(invoke(concurrentHandler,A.token,taskC));await started;const callerB=await response(invoke(concurrentHandler,A.token,taskC));release();const callerAResult=await callerA;assert.equal(concurrentCounter.count,1);assert.deepEqual(new Set([callerAResult.body.kind,callerB.body.kind]),new Set(["generated","already_running"]));assert.deepEqual((await state(taskC)).steps.map(x=>x.status),["completed","completed","completed","waiting_user","pending","pending"]);

 const tf=await target(A,"Failure"),taskF=await task(A.id,tf);const failing=createBirthdayTaskContinuationHandler({provider:()=>async()=>{throw new Error("controlled");}});const failed=await response(invoke(failing,A.token,taskF));assert.equal(failed.status,502);assert.deepEqual((await state(taskF)).steps.map(x=>x.status),["completed","completed","pending","pending","pending","pending"]);const retryCounter={count:0};const retried=await response(invoke(createBirthdayTaskContinuationHandler({provider:()=>canonical(retryCounter,[])}),A.token,taskF));assert.equal(retried.body.kind,"generated");

 const ti=await target(A,"Invalid"),taskI=await task(A.id,ti);const invalid=await response(invoke(createBirthdayTaskContinuationHandler({provider:()=>async()=>({idea:{title:"bad",message:"bad",reasonSources:[]}})}),A.token,taskI));assert.equal(invalid.status,502);assert.deepEqual((await state(taskI)).steps.map(x=>x.status),["completed","completed","pending","pending","pending","pending"]);

 const ts=await target(A,"Stale"),taskS=await task(A.id,ts);let staleRelease;let staleSignal;const staleStarted=new Promise(r=>staleSignal=r);const staleWait=new Promise(r=>staleRelease=r);const staleCall=response(invoke(createBirthdayTaskContinuationHandler({provider:()=>canonical({count:0},[],{started:staleSignal,wait:staleWait})}),A.token,taskS));await staleStarted;assert.ifError((await admin.from("happy_tasks").update({status:"paused",paused_at:new Date().toISOString()}).eq("id",taskS)).error);staleRelease();const stale=await staleCall;assert.equal(stale.body.kind,"already_running");const staleState=await state(taskS);assert.equal(staleState.task.status,"paused");assert.equal(staleState.steps[2].status,"pending");

 const rls=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${A.token}`}},auth:{persistSession:false,autoRefreshToken:false}});const taskAcl=await rls.from("happy_tasks").update({status:"completed"}).eq("id",taskA);const stepAcl=await rls.from("happy_task_steps").update({status:"completed"}).eq("task_id",taskA);assert.ok(taskAcl.error);assert.ok(stepAcl.error);
 console.log(JSON.stringify({standard:standard.body.kind,standardSteps:standardState.steps.map(x=>`${x.position}:${x.type}:${x.status}`),providerCalls:counter.count,resume:resumed.body.kind,foreign:foreign.status,missing:missing.status,unauthenticated:unauth.status,concurrent:[callerAResult.body.kind,callerB.body.kind],concurrentProviderCalls:concurrentCounter.count,providerFailure:failed.body.kind,retry:retried.body.kind,invalid:invalid.body.kind,stale:{result:stale.body.kind,task:staleState.task.status,step:staleState.steps[2].status},acl:{task:taskAcl.error.code,step:stepAcl.error.code},nonWorkflowCountsUnchanged:true}));
} finally {for(const id of users)await admin.auth.admin.deleteUser(id);}
