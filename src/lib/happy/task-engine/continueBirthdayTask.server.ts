import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabasePublicConfig } from "@/lib/supabase/publicConfig";
import { buildHappyAgentContext } from "../agent-context/buildHappyAgentContext.server";
import { selectHappyAgentContextForIntent } from "../agent-context/selectHappyAgentContextForIntent";
import { createHappyAgentResponse } from "../agent/happyAgentServer";
import { createOpenAiHappyAgentProvider } from "../agent/happyAgentProvider.server";
import type { HappyAgentProvider } from "../agent/happyAgent.types";
import { resolveBirthdayTaskContinuation, type DurableBirthdayStep } from "./birthdayTaskContinuation";

type Task = { id:string; user_id:string; type:string; status:string; person_id:string|null; event_id:string|null; context_snapshot:unknown };
type Step = DurableBirthdayStep;
export type ContinueBirthdayTaskResult =
 | { kind:"generated"; taskId:string; ui: unknown[] }
 | { kind:"waiting_user"; taskId:string; step:"choose_gift" }
 | { kind:"paused" | "terminal" | "already_running"; taskId:string }
 | { kind:"not_found" | "invalid_state" | "unavailable" | "provider_unavailable" };

function admin(): SupabaseClient | null { const config=readSupabasePublicConfig(); const key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(); return config&&key ? createClient(config.url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}) : null; }
function version(v: unknown): unknown { return v && typeof v === "object" ? (v as {templateVersion?:unknown}).templateVersion : null; }
async function load(client:SupabaseClient,userId:string,taskId:string):Promise<{task:Task;steps:Step[]}|null|undefined> {
 const {data:task,error}=await client.from("happy_tasks").select("id,user_id,type,status,person_id,event_id,context_snapshot").eq("id",taskId).eq("user_id",userId).maybeSingle();
 if(error)return undefined; if(!task)return null;
 const t=task as Task;
 const {data:steps,error:stepError}=await client.from("happy_task_steps").select("id,position,type,status,requires_approval").eq("task_id",taskId).order("position");
 if(stepError)return undefined;
 return {task:t,steps:(steps??[]).map((s)=>({id:s.id,position:s.position,type:s.type,status:s.status,requiresApproval:s.requires_approval}))};
}
async function transition(client:SupabaseClient, step:Step, from:string, to:string) { const {data,error}=await client.from("happy_task_steps").update({status:to,completed_at:to==="completed"?new Date().toISOString():null,started_at:to==="active"?new Date().toISOString():null}).eq("id",step.id).eq("status",from).select("id").maybeSingle(); return !error && !!data; }

/** Server-only, bounded runner for the exact persisted birthday V1 template. */
export async function continueBirthdayTask(input:{userId:string;taskId:string;locale:string;timezone:string;provider?:HappyAgentProvider}):Promise<ContinueBirthdayTaskResult> {
 const client=admin(); if(!client)return {kind:"unavailable"};
 for(let transitions=0;transitions<3;transitions++) {
  const loaded=await load(client,input.userId,input.taskId); if(loaded===undefined)return {kind:"unavailable"}; if(loaded===null)return {kind:"not_found"};
  const {task,steps}=loaded;
  if(task.type!=="birthday_preparation"||!task.person_id||!task.event_id)return {kind:"invalid_state"};
  const decision=resolveBirthdayTaskContinuation({type:task.type,status:task.status,templateVersion:version(task.context_snapshot),steps});
  if(decision.kind==="invalid_state")return {kind:"invalid_state"};
  if(decision.kind==="paused"||decision.kind==="terminal"||decision.kind==="already_running")return {kind:decision.kind,taskId:task.id};
  const step=steps.find((s)=>s.type===decision.step); if(!step)return {kind:"invalid_state"};
  if(decision.kind==="waiting_user") return {kind:"waiting_user",taskId:task.id,step:"choose_gift"};
  if(decision.kind==="deterministic") { if(!await transition(client,step,"pending","completed")) continue; continue; }
  // Claim exactly one generative step before constructing any provider input.
  if(!await transition(client,step,"pending","active")) continue;
  const context=await buildHappyAgentContext({client,userId:input.userId,locale:input.locale,timezone:input.timezone,personId:task.person_id,eventId:task.event_id,taskId:task.id});
  const selected=context.kind==="ok" ? selectHappyAgentContextForIntent(context.context,"birthday_gift") : null;
  if(!selected||selected.kind!=="ok") { await transition(client,step,"active","pending"); return {kind:"invalid_state"}; }
  try {
   const response=await createHappyAgentResponse({intent:"birthday_gift",context:selected.context,provider:input.provider??createOpenAiHappyAgentProvider(),signal:AbortSignal.timeout(30_000)});
   const choose=steps.find((s)=>s.type==="choose_gift"); if(!choose)return {kind:"invalid_state"};
   const {data:completed,error:completionError}=await client.rpc("complete_birthday_gift_generation_v1",{p_task_id:task.id,p_generate_step_id:step.id,p_choose_step_id:choose.id});
   if(completionError||completed!==true) { await transition(client,step,"active","pending"); return {kind:"already_running",taskId:task.id}; }
   return {kind:"generated",taskId:task.id,ui:response.ui??[]};
  } catch { await transition(client,step,"active","pending"); return {kind:"provider_unavailable"}; }
 }
 return {kind:"already_running",taskId:input.taskId};
}
