import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const { resolveBirthdayTaskContinuation } = await import("../src/lib/happy/task-engine/birthdayTaskContinuation.ts");
const types=["analyze_context","analyze_gifts","generate_gift_ideas","choose_gift","save_gift","prepare_greeting"];
const steps=(states=[])=>types.map((type,i)=>({id:`s${i}`,position:i+1,type,status:states[i]??"pending",requiresApproval:type==="save_gift"}));
const state=(overrides={})=>({type:"birthday_preparation",status:"active",templateVersion:1,steps:steps(),...overrides});

test("exact birthday V1 advances deterministic first steps and rejects malformed templates",()=>{
 assert.deepEqual(resolveBirthdayTaskContinuation(state()),{kind:"deterministic",step:"analyze_context"});
 assert.deepEqual(resolveBirthdayTaskContinuation(state({steps:steps(["completed"])})),{kind:"deterministic",step:"analyze_gifts"});
 assert.equal(resolveBirthdayTaskContinuation(state({type:"other"})).kind,"invalid_state");
 assert.equal(resolveBirthdayTaskContinuation(state({templateVersion:2})).kind,"invalid_state");
 assert.equal(resolveBirthdayTaskContinuation(state({steps:steps().slice(0,5)})).kind,"invalid_state");
 const reordered=steps(); [reordered[1].type,reordered[2].type]=[reordered[2].type,reordered[1].type]; assert.equal(resolveBirthdayTaskContinuation(state({steps:reordered})).kind,"invalid_state");
});
test("generation is claimed once and choose_gift remains a durable user boundary",()=>{
 assert.deepEqual(resolveBirthdayTaskContinuation(state({steps:steps(["completed","completed"])})),{kind:"generate_gift_ideas",step:"generate_gift_ideas"});
 assert.deepEqual(resolveBirthdayTaskContinuation(state({steps:steps(["completed","completed","active"])})),{kind:"already_running",step:"generate_gift_ideas"});
 assert.deepEqual(resolveBirthdayTaskContinuation(state({status:"waiting_user",steps:steps(["completed","completed","completed","waiting_user"])})),{kind:"waiting_user",step:"choose_gift"});
 assert.equal(resolveBirthdayTaskContinuation(state({status:"paused"})).kind,"paused");
 assert.equal(resolveBirthdayTaskContinuation(state({status:"completed"})).kind,"terminal");
});
test("continuation route derives all authority server-side and UI uses only task identity",async()=>{
 const route=await readFile(new URL("../src/app/api/happy/tasks/[id]/continue/route.ts",import.meta.url),"utf8");
 const application=await readFile(new URL("../src/lib/happy/task-engine/continueBirthdayTaskApplication.server.ts",import.meta.url),"utf8");
 const runner=await readFile(new URL("../src/lib/happy/task-engine/continueBirthdayTask.server.ts",import.meta.url),"utf8");
 const home=await readFile(new URL("../src/components/HomePageClient.tsx",import.meta.url),"utf8");
 assert.match(route,/createOpenAiHappyAgentProvider/); assert.match(route,/createBirthdayTaskContinuationHandler/); assert.doesNotMatch(route,/TEST|process\.env|request\.json|personId|eventId|templateVersion/);
 assert.match(application,/await request\.text\(\)/); assert.match(application,/getAssistantRequestIdentity/); assert.doesNotMatch(application,/request\.json|personId|eventId|templateVersion/);
 assert.match(runner,/eq\("user_id",userId\)/); assert.match(runner,/eq\("status",from\)/); assert.match(runner,/AbortSignal\.timeout/); assert.match(runner,/happy_task_steps/); assert.doesNotMatch(runner,/from\("gifts"\)\.(insert|update)|happy_actions.*insert/);
 assert.match(home,/\/api\/happy\/tasks\/\$\{encodeURIComponent\(taskId\)\}\/continue/); assert.match(home,/\{ type: "task", taskId \}/);
});
test("completion handoff is atomic and rejects a stale task",async()=>{
 const migration=await readFile(new URL("../supabase/migrations/20261011120418_birthday_task_continuation_hardening.sql",import.meta.url),"utf8");
 const runner=await readFile(new URL("../src/lib/happy/task-engine/continueBirthdayTask.server.ts",import.meta.url),"utf8");
 assert.match(migration,/complete_birthday_gift_generation_v1/); assert.match(migration,/security definer/); assert.match(migration,/set search_path = ''/); assert.match(migration,/revoke all on function public\.complete_birthday_gift_generation_v1.*from public, anon, authenticated/i);
 assert.match(runner,/complete_birthday_gift_generation_v1/);
});
